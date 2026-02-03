"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { LoginForm } from "@/components/auth/login-form";
import { Onboarding } from "@/components/onboarding";
import { TrialOffer, PremiumActivation } from "@/components/premium-activation";
import { DashboardTab } from "@/components/tabs/dashboard-tab";
import { InjectionsTab } from "@/components/tabs/injections-tab";
import { JournalTab } from "@/components/tabs/journal-tab";
import { CommunityTab } from "@/components/tabs/community-tab";
import { AcademyTab } from "@/components/tabs/academy-tab";
import { SunTab } from "@/components/tabs/sun-tab";
import { BodyTab } from "@/components/tabs/body-tab";
import { AdminTab } from "@/components/tabs/admin-tab";
import { 
  LayoutDashboard, 
  Syringe, 
  BookOpen, 
  Users,
  Loader2,
  PersonStanding,
  Shield,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "dashboard" | "body" | "injections" | "academy" | "sun" | "journal" | "community" | "admin";

// Custom Sun icon component using the uploaded image
const SunIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://assets.macaly-user-data.dev/undefined/w1a2vub2qup8k9p1n9f2aj5z/g2nkBH5zBqrsbNtiVmYut/output.png" 
    alt="Slunce" 
    className={cn(className, "rounded-full aspect-square object-cover")}
  />
);

const tabs: { id: TabId; label: string; icon: React.ElementType; adminOnly?: boolean; noLabel?: boolean }[] = [
  { id: "dashboard", label: "Přehled", icon: LayoutDashboard },
  { id: "journal", label: "Deník", icon: BookOpen },
  { id: "community", label: "Komunita", icon: Users },
  { id: "sun", label: "Slunce", icon: SunIcon, noLabel: true },
  { id: "body", label: "Tělo", icon: PersonStanding },
  { id: "injections", label: "Injekce", icon: Syringe },
  { id: "academy", label: "Akademie", icon: GraduationCap },
  { id: "admin", label: "Admin", icon: Shield, adminOnly: true },
];

export function AppShell() {
  const user = useQuery(api.users.currentLoggedInUser);
  const isAdmin = useQuery(api.authz.isAdmin, {});
  const premiumStatus = useQuery(api.users.checkPremiumStatus);
  const activateTrial = useMutation(api.users.activateTrial);
  
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTrialOffer, setShowTrialOffer] = useState(false);
  const [showPremiumActivation, setShowPremiumActivation] = useState(false);
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  // Set default tab (sun tab for everyone)
  useEffect(() => {
    if (activeTab === null && isAdmin !== undefined) {
      setActiveTab("sun");
    }
  }, [isAdmin, activeTab]);

  // Loading state
  if (user === undefined || activeTab === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Načítám...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (user === null) {
    return <LoginForm />;
  }

  // Handler for trial activation
  const handleActivateTrial = async () => {
    setIsActivatingTrial(true);
    try {
      const result = await activateTrial();
      if (result.success) {
        toast.success("60-denní Adaptační Protokol aktivován!");
        setShowTrialOffer(false);
      } else {
        toast.error(result.error || "Nepodařilo se aktivovat trial");
      }
    } catch (error) {
      console.error("Trial activation error:", error);
      toast.error("Chyba při aktivaci");
    } finally {
      setIsActivatingTrial(false);
    }
  };

  // Show onboarding for new users
  if (!user.onboardingComplete || showOnboarding) {
    return (
      <Onboarding 
        onComplete={() => {
          setShowOnboarding(false);
          // After onboarding, show trial offer if not used yet
          if (!user.trialActivated) {
            setShowTrialOffer(true);
          }
        }} 
      />
    );
  }

  // Show trial offer after onboarding (for first-time users)
  if (showTrialOffer && !user.trialActivated) {
    return (
      <TrialOffer
        onActivate={handleActivateTrial}
        onSkip={() => setShowTrialOffer(false)}
        isActivating={isActivatingTrial}
      />
    );
  }

  // Show premium activation if premium expired (and not admin)
  if (showPremiumActivation && !isAdmin) {
    return (
      <PremiumActivation
        trialAlreadyUsed={user.trialActivated || false}
        onSuccess={() => setShowPremiumActivation(false)}
      />
    );
  }

  // Check if user needs to see premium gate (non-premium, non-admin, trial already used)
  const needsPremium = premiumStatus && !premiumStatus.isPremium && user.trialActivated && !isAdmin;
  if (needsPremium && !showPremiumActivation) {
    // Don't block immediately - let user see the app but show prompt
  }

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab user={user} />;
      case "body":
        return <BodyTab user={user} />;
      case "injections":
        return <InjectionsTab user={user} />;
      case "academy":
        return <AcademyTab user={user} />;
      case "sun":
        return <SunTab user={user} />;
      case "journal":
        return <JournalTab user={user} />;
      case "community":
        return <CommunityTab user={user} />;
      case "admin":
        return <AdminTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20">
        {renderTabContent()}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {tabs
            .filter((tab) => !tab.adminOnly || isAdmin)
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    tab.noLabel ? "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 absolute -top-[18px] sm:-top-[22px] md:-top-[27px]" : "w-5 h-5"
                  )} />
                  {!tab.noLabel && <span className="text-[10px] font-medium">{tab.label}</span>}
                </button>
              );
            })}
        </div>
      </nav>
    </div>
  );
}
