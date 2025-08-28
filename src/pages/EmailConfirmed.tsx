import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const EmailConfirmed = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the token from URL parameters
        const access_token = searchParams.get('access_token');
        const refresh_token = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        if (type === 'signup' && access_token && refresh_token) {
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (error) {
            console.error('Error setting session:', error);
            setStatus('error');
            setMessage('Failed to confirm email. Please try again.');
            return;
          }

          if (data.user) {
            setStatus('success');
            setMessage('Your email has been successfully confirmed. You can now continue to use the app.');
            
            // Redirect to main app after 3 seconds
            setTimeout(() => {
              navigate('/');
            }, 3000);
          }
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link. Please check your email and try again.');
        }
      } catch (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
      </div>

      <Card className="glass-card p-8 max-w-md w-full text-center relative z-10">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Confirming Your Email
            </h1>
            <p className="text-muted-foreground">
              Please wait while we verify your email address...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-bold text-foreground mb-4">
              ✅ Email Confirmed!
            </h1>
            <p className="text-muted-foreground mb-6">
              {message}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              You will be redirected automatically in a few seconds.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="glow-button w-full"
            >
              Continue to App
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Confirmation Failed
            </h1>
            <p className="text-muted-foreground mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth')}
                className="glow-button w-full"
              >
                Back to Login
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default EmailConfirmed;