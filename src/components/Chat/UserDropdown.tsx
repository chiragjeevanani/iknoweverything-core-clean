import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { User, LogOut, Info, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

const UserDropdown: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const item =
    "flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:outline-none";

  const handleAbout = () => {
    setOpen(false);
    navigate("/about");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } finally {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="User menu"
          className="flex items-center gap-2 p-2 rounded-full hover:bg-accent"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
      </PopoverTrigger>

      {/* Uses theme tokens: bg-popover, text-popover-foreground, border-border */}
      <PopoverContent className="w-56 p-1 z-50">
        <button onClick={handleAbout} className={item}>
          <Info className="h-4 w-4" />
          About
        </button>

        <Separator className="my-1" />

        <button onClick={handleSignOut} className={item}>
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default UserDropdown;


