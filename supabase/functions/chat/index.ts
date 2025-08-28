import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body with better error handling
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      throw new Error('Invalid request body');
    }
    
    const { message, conversationId, files = [] } = body;
    
    console.log('Processing chat request:', { message, conversationId, filesCount: files?.length || 0 });
    
    if (!message && (!files || files.length === 0)) {
      throw new Error('Either message or files must be provided');
    }
    
    // Get the authenticated user using JWT from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract JWT token from Bearer format
    const jwt = authHeader.replace('Bearer ', '');
    console.log('JWT token present:', jwt ? 'Yes' : 'No');

    // Create Supabase client with service role for admin access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify JWT and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('JWT verification failed:', userError);
      throw new Error(`User not authenticated: ${userError?.message || 'Invalid JWT token'}`);
    }

    console.log('Processing chat request for user:', user.id, 'email:', user.email);
    
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      throw new Error('Google Gemini API key not found');
    }

    // Store user message in database (handle empty message for image-only prompts)
    const messageContent = message || '[Image analysis requested]';
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: messageContent,
        role: 'user',
        user_id: user.id
      });

    if (messageError) {
      console.error('Error storing user message:', messageError);
      throw messageError;
    }

    // Get conversation history for context
    const { data: messages, error: historyError } = await supabase
      .from('messages')
      .select('content, role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.error('Error fetching conversation history:', historyError);
    }

    // Prepare messages for Gemini
    const contextMessages = (messages || []).filter(msg => msg.role !== 'system');
    
    const geminiMessages = contextMessages.map((msg, index) => {
      const parts = [{ text: msg.content }];
      
      // Add images to the latest user message if files are provided
      if (index === contextMessages.length - 1 && msg.role === 'user' && files && files.length > 0) {
        files.forEach((file: any) => {
          if (file.type.startsWith('image/')) {
            const base64Data = file.data.split(',')[1]; // Remove data:image/...;base64, prefix
            parts.push({
              inlineData: {
                mimeType: file.type,
                data: base64Data
              }
            });
          }
        });
      }
      
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts
      };
    });

    // Prepare current message (handle empty message for image-only prompts)
    const currentMessageParts = message ? [{ text: message }] : [{ text: "Please analyze this image." }];
    if (files && files.length > 0) {
      files.forEach((file: any) => {
        if (file.type.startsWith('image/')) {
          const base64Data = file.data.split(',')[1];
          currentMessageParts.push({
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          });
        }
      });
    }

    // System instruction
    const systemInstruction = `You are IKnowEverything, an intelligent AI assistant with vast knowledge and logical thinking capabilities. You understand and can discuss any topic with depth and accuracy. You think logically, provide comprehensive answers, and help users with any questions or tasks they have. You are knowledgeable, helpful, and can engage in meaningful conversations on any subject.`;

    console.log('Sending request to Google Gemini with', geminiMessages.length, 'messages');

    // Make request to Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          ...geminiMessages,
          {
            role: 'user',
            parts: currentMessageParts
          }
        ],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Gemini API error:', errorText);
      throw new Error(`Google Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.candidates[0].content.parts[0].text;

    console.log('Google Gemini response received, storing assistant message');

    // Store assistant message in database
    const { error: assistantMessageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: assistantMessage,
        role: 'assistant',
        user_id: user.id
      });

    if (assistantMessageError) {
      console.error('Error storing assistant message:', assistantMessageError);
      throw assistantMessageError;
    }

    return new Response(JSON.stringify({ 
      response: assistantMessage,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});