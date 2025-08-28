import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeBlockProps {
  children: string;
  language?: string;
  isOutput?: boolean;
}

const CodeBlock = ({ children, language, isOutput = false }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Code has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy code to clipboard.",
        variant: "destructive",
      });
    }
  };

  const title = isOutput ? "Output" : (language ? language.toUpperCase() : "Code");

  return (
    <div className="relative my-4">
      {/* Terminal Header */}
      <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 rounded-t-lg px-4 py-2 border-b border-gray-600">
        <div className="flex items-center gap-2">
          {/* Terminal dots */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-gray-300 text-sm font-medium ml-2">{title}</span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-2 text-gray-300 hover:text-white hover:bg-gray-700"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              📋 Copy code
            </>
          )}
        </Button>
      </div>

      {/* Code Content */}
      <div className="bg-gray-900 dark:bg-black rounded-b-lg overflow-hidden">
        <pre className="p-4 overflow-x-auto text-sm">
          <code className="text-gray-100 font-mono leading-relaxed whitespace-pre">
            {children}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;