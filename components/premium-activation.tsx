"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Check, Sparkles, Gift, CreditCard, Crown } from "lucide-react";
import { toast } from "sonner";

// Subscription products
const SUBSCRIPTION_PRODUCTS = [
  {
    id: "monthly_sub",
    title: "Měsíční Start",
    durationMonths: 1,
    priceCzk: 299,
    badge: null,
    description: "Flexibilní, lze kdykoliv zrušit.",
    isDecoy: true,
  },
  {
    id: "quarterly_sub",
    title: "90denní Protokol",
    durationMonths: 3,
    priceCzk: 599,
    badge: "DOPORUČENO LÉKAŘI",
    description: "Ideální pro překonání adaptační fáze.",
    isHero: true,
    savingsText: "Ušetříte 33 %",
  },
  {
    id: "yearly_sub",
    title: "Roční Transformace",
    durationMonths: 12,
    priceCzk: 1490,
    badge: "NEJVÝHODNĚJŠÍ",
    description: "Pro dlouhodobou změnu životního stylu.",
    isHero: false,
    savingsText: "Ušetříte 60 %",
  },
];

interface PremiumActivationProps {
  onSuccess?: () => void;
  trialAlreadyUsed?: boolean;
}

export function PremiumActivation({ onSuccess, trialAlreadyUsed = false }: PremiumActivationProps) {
  const [promoCode, setPromoCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  
  const redeemPromoCode = useMutation(api.users.redeemPromoCode);

  const handleRedeemCode = async () => {
    if (!promoCode.trim()) return;
    
    setIsRedeeming(true);
    try {
      const result = await redeemPromoCode({ code: promoCode.trim() });
      
      if (result.success) {
        toast.success(`Premium aktivováno! (${result.productTitle})`);
        onSuccess?.();
      } else {
        toast.error(result.error || "Nepodařilo se aktivovat kód");
      }
    } catch (error) {
      console.error("Redeem error:", error);
      toast.error("Chyba při aktivaci kódu");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleSubscribe = (productId: string) => {
    // TODO: Implement payment gateway
    toast.info("Platební brána bude brzy k dispozici");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #1a1040 0%, #0d0d1a 50%, #0a0a12 100%)"
        }}
      />
      
      {/* Sparkle effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 2 + 1}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mb-2">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Odemkni Premium
          </h1>
          <p className="text-gray-400">
            Získej přístup ke všem funkcím aplikace
          </p>
        </div>

        {/* Promo Code Section */}
        <div className="w-full">
          {!showPromoInput ? (
            <button
              onClick={() => setShowPromoInput(true)}
              className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-2 transition-all"
            >
              <Gift className="w-5 h-5" />
              Mám promo kód
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-xl bg-white/10">
              <p className="text-sm text-gray-300 text-center">
                Zadej svůj promo kód
              </p>
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  className="h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-500 text-center font-mono text-lg tracking-widest"
                  maxLength={8}
                />
                <Button
                  onClick={handleRedeemCode}
                  disabled={!promoCode.trim() || isRedeeming}
                  className="h-12 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  {isRedeeming ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <button
                onClick={() => setShowPromoInput(false)}
                className="text-sm text-gray-400 hover:text-gray-300 w-full text-center"
              >
                Zrušit
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-gray-400 text-sm">nebo</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Subscription Plans */}
        <div className="w-full space-y-3">
          <p className="text-center text-white font-medium">
            Vyber si předplatné
          </p>
          
          {SUBSCRIPTION_PRODUCTS.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSubscribe(product.id)}
              className={cn(
                "w-full p-4 rounded-xl transition-all relative overflow-hidden",
                product.isHero 
                  ? "bg-gradient-to-br from-purple-600/40 to-indigo-600/40 border-2 border-purple-500/50 hover:border-purple-400"
                  : "bg-white/10 hover:bg-white/15 border border-white/10"
              )}
            >
              {/* Badge */}
              {product.badge && (
                <div className={cn(
                  "absolute -right-8 top-3 rotate-45 text-[10px] font-bold py-1 px-8",
                  product.isHero 
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black" 
                    : "bg-emerald-500 text-white"
                )}>
                  {product.badge}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-white font-semibold">{product.title}</h3>
                  <p className="text-gray-400 text-sm">{product.description}</p>
                  {product.savingsText && (
                    <p className="text-emerald-400 text-xs mt-1">{product.savingsText}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-xl">{product.priceCzk} Kč</p>
                  <p className="text-gray-400 text-xs">
                    {product.durationMonths === 1 ? "měsíčně" : 
                     product.durationMonths === 3 ? "za 3 měsíce" : "ročně"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Payment info */}
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <CreditCard className="w-4 h-4" />
          <span>Bezpečná platba kartou</span>
        </div>
      </div>
    </div>
  );
}

// Trial offer component (shown after onboarding)
interface TrialOfferProps {
  onActivate: () => void;
  onSkip: () => void;
  isActivating?: boolean;
}

export function TrialOffer({ onActivate, onSkip, isActivating }: TrialOfferProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #1a1040 0%, #0d0d1a 50%, #0a0a12 100%)"
        }}
      />
      
      {/* Sparkle effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.2,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 2 + 1}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center space-y-8 animate-in fade-in duration-500">
        {/* Crown icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center animate-pulse">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -inset-2 rounded-full border-2 border-amber-400/30 animate-ping" />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">
            60-denní Adaptační Protokol
          </h1>
          <p className="text-gray-300 text-lg">
            Tvůj dárek za registraci
          </p>
        </div>

        {/* Benefits */}
        <div className="w-full space-y-3">
          {[
            "Všechny premium funkce",
            "Neomezené záznamy",
            "Detailní grafy a statistiky",
            "Export dat",
          ].map((benefit, i) => (
            <div 
              key={i}
              className="flex items-center gap-3 py-2 px-4 rounded-xl bg-white/10"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-white">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Price comparison */}
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            <span className="line-through">Hodnota 598 Kč</span>
          </p>
          <p className="text-3xl font-bold text-emerald-400">
            ZDARMA
          </p>
          <p className="text-gray-400 text-sm">
            na 60 dní
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={onActivate}
            disabled={isActivating}
            className={cn(
              "w-full py-4 rounded-2xl text-lg font-semibold text-white transition-all",
              "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
              "shadow-lg hover:shadow-xl shadow-amber-500/25",
              "flex items-center justify-center gap-2",
              isActivating && "opacity-50 cursor-not-allowed"
            )}
          >
            {isActivating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Aktivovat zdarma
              </>
            )}
          </button>
          
          <button
            onClick={onSkip}
            disabled={isActivating}
            className="w-full py-3 text-gray-400 hover:text-gray-300 transition-colors"
          >
            Přeskočit, možná později
          </button>
        </div>
      </div>
    </div>
  );
}
