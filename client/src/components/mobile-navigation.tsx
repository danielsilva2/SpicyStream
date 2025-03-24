import { Link } from "wouter";
import { Home, Rss, PlusCircle, Bookmark, User } from "lucide-react";

interface MobileNavigationProps {
  activeTab: "home" | "feed" | "upload" | "saved" | "profile";
}

export default function MobileNavigation({ activeTab }: MobileNavigationProps) {
  const tabs = [
    { id: "home", label: "Home", icon: Home, href: "/" },
    { id: "feed", label: "Feed", icon: Rss, href: "/feed" },
    { id: "upload", label: "Upload", icon: PlusCircle, href: "/upload" },
    { id: "saved", label: "Saved", icon: Bookmark, href: "/saved" },
    { id: "profile", label: "Profile", icon: User, href: "/profile" },
  ];
  
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          
          return (
            <Link 
              key={tab.id} 
              href={tab.href}
              className={`flex flex-col items-center justify-center py-3 ${
                isActive ? "text-primary" : "text-gray-500 hover:text-primary"
              }`}
            >
              <Icon className={`${tab.id === "upload" ? "h-7 w-7" : "h-5 w-5"}`} />
              <span className="text-xs mt-1">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
