import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code, Shield, Cloud, Zap } from 'lucide-react';

const About = () => {
  const skills = [
    {
      icon: <Code className="w-5 h-5" />,
      title: "Full-Stack Web Development",
      description: "React, Node.js, MongoDB, Express"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "API Integration and Automation",
      description: "RESTful APIs, GraphQL, Webhooks"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Cybersecurity Enthusiast",
      description: "Security best practices, Penetration testing"
    },
    {
      icon: <Cloud className="w-5 h-5" />,
      title: "Cloud Services and Deployment",
      description: "AWS, Docker, CI/CD, Serverless"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background px-4 py-8 sm:py-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4 sm:mb-6">
              About This Project
            </h1>
            <Card className="glass-card p-6 sm:p-8 inline-block w-full sm:w-auto">
              <p className="text-lg sm:text-xl text-muted-foreground">
                This project is made by{' '}
                <span className="font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Chirag Jeevanani
                </span>
              </p>
            </Card>
          </div>

          {/* Skills Section */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6 sm:mb-8 text-foreground">
              Technical Expertise
            </h2>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              {skills.map((skill, index) => (
                <Card 
                  key={index} 
                  className="glass-card p-4 sm:p-6 hover:scale-105 transition-all duration-300 hover:border-primary/30"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary text-white flex-shrink-0">
                      {skill.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">
                        {skill.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {skill.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Project Info */}
          <Card className="glass-card p-6 sm:p-8 text-center">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
              Project Highlights
            </h3>
            <div className="flex flex-wrap justify-center gap-2 mb-4 sm:mb-6">
              <Badge variant="secondary">React</Badge>
              <Badge variant="secondary">TypeScript</Badge>
              <Badge variant="secondary">Supabase</Badge>
              <Badge variant="secondary">Tailwind CSS</Badge>
              <Badge variant="secondary">AI Integration</Badge>
              <Badge variant="secondary">Modern UI/UX</Badge>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A modern AI-powered chat application built with cutting-edge technologies, 
              featuring real-time conversations, file uploads, image processing, and a 
              beautiful glassmorphism design.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default About;