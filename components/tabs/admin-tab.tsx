"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Users,
  Weight,
  Syringe,
  Ruler,
  SmilePlus,
  Package,
  Calendar,
  Mail,
  User,
  Loader2,
  ShieldAlert,
  Crown,
  Gift,
  Copy,
  Check,
  Ticket,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { substancesDB } from "@/lib/constants";

// Subscription products for promo code generation
const SUBSCRIPTION_PRODUCTS = [
  { id: "monthly_sub", title: "Měsíční Start", durationMonths: 1 },
  { id: "quarterly_sub", title: "90denní Protokol", durationMonths: 3 },
  { id: "yearly_sub", title: "Roční Transformace", durationMonths: 12 },
];

export function AdminTab() {
  const isAdmin = useQuery(api.authz.isAdmin, {});
  const allUsersResult = useQuery(api.admin.getAllUsers, isAdmin ? {} : "skip");
  const promoCodesResult = useQuery(api.admin.getPromoCodes, isAdmin ? {} : "skip");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("quarterly_sub");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [togglingPremium, setTogglingPremium] = useState<Id<"users"> | null>(null);
  
  const generatePromoCode = useMutation(api.admin.generatePromoCode);
  const setUserPremiumPermanent = useMutation(api.admin.setUserPremiumPermanent);
  
  const userDataResult = useQuery(
    api.admin.getUserData,
    isAdmin && selectedUserId ? { userId: selectedUserId } : "skip"
  );

  // Copy code to clipboard
  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Kód zkopírován!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Generate new promo code
  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const result = await generatePromoCode({ productId: selectedProductId });
      if (result.ok) {
        toast.success(`Kód vygenerován: ${result.code}`);
        handleCopyCode(result.code!);
      } else {
        toast.error(result.message || "Chyba při generování kódu");
      }
    } catch (error) {
      console.error("Generate promo code error:", error);
      toast.error("Chyba při generování kódu");
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle user premium permanent
  const handleTogglePremium = async (userId: Id<"users">, currentPermanent: boolean) => {
    setTogglingPremium(userId);
    try {
      const result = await setUserPremiumPermanent({ userId, permanent: !currentPermanent });
      if (result.ok) {
        toast.success(result.permanent ? "Premium aktivováno" : "Premium deaktivováno");
      } else {
        toast.error(result.message || "Chyba");
      }
    } catch (error) {
      console.error("Toggle premium error:", error);
      toast.error("Chyba");
    } finally {
      setTogglingPremium(null);
    }
  };

  // Loading
  if (isAdmin === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h2 className="text-xl font-bold">Přístup odepřen</h2>
        <p className="text-muted-foreground">
          Nemáte oprávnění k přístupu do administrace.
        </p>
      </div>
    );
  }

  // Loading users
  if (!allUsersResult) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error
  if (!allUsersResult.ok) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <p className="text-destructive">{allUsersResult.message}</p>
      </div>
    );
  }

  const { users } = allUsersResult;

  // User detail view
  if (selectedUserId && userDataResult) {
    if (!userDataResult.ok) {
      return (
        <div className="p-4">
          <Button variant="ghost" onClick={() => setSelectedUserId(null)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět
          </Button>
          <p className="text-destructive">{userDataResult.message}</p>
        </div>
      );
    }

    const { user, weightRecords, injectionRecords, measureRecords, moodRecords, stockItems } =
      userDataResult;

    return (
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedUserId(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {user.name || user.surname
                  ? `${user.name || ""} ${user.surname || ""}`.trim()
                  : "Bez jména"}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email || "Bez emailu"}</p>
            </div>
          </div>

          {/* Premium Management Card */}
          <Card className="border-amber-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                Premium status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Trvalé Premium</p>
                  <p className="text-xs text-muted-foreground">
                    Aktivuje/deaktivuje premium natrvalo
                  </p>
                </div>
                <Switch
                  checked={user.premiumPermanent || false}
                  disabled={togglingPremium === user._id}
                  onCheckedChange={() => handleTogglePremium(user._id, user.premiumPermanent || false)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                <div>
                  <span className="text-muted-foreground">Trial použit:</span>{" "}
                  <span className="font-medium">{user.trialActivated ? "Ano" : "Ne"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Premium do:</span>{" "}
                  <span className="font-medium">
                    {user.premiumPermanent 
                      ? "∞ Navždy" 
                      : user.premiumUntil 
                        ? new Date(user.premiumUntil).toLocaleDateString("cs")
                        : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Profil
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Výška:</span>{" "}
                <span className="font-medium">{user.heightCm ? `${user.heightCm} cm` : "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cílová váha:</span>{" "}
                <span className="font-medium">
                  {user.targetWeightKg ? `${user.targetWeightKg} kg` : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Pohlaví:</span>{" "}
                <span className="font-medium">
                  {user.gender === "male" ? "Muž" : user.gender === "female" ? "Žena" : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Cíl:</span>{" "}
                <span className="font-medium">
                  {user.goal === "lose"
                    ? "Hubnout"
                    : user.goal === "maintain"
                      ? "Udržet"
                      : user.goal === "gain"
                        ? "Přibrat"
                        : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Výchozí lék:</span>{" "}
                <span className="font-medium">
                  {user.defaultSubstanceId
                    ? substancesDB.find((s) => s.id === user.defaultSubstanceId)?.name || "—"
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Režim:</span>{" "}
                <span className="font-medium">{user.isUSMode ? "US" : "EU"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Weight Records */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Weight className="w-4 h-4" />
                Váhy ({weightRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weightRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné záznamy</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {weightRecords.slice(0, 10).map((record) => (
                    <div
                      key={record._id}
                      className="flex justify-between text-sm border-b border-border pb-1"
                    >
                      <span className="text-muted-foreground">
                        {new Date(record.date).toLocaleDateString("cs")}
                      </span>
                      <span className="font-medium">{record.kg.toFixed(1)} kg</span>
                    </div>
                  ))}
                  {weightRecords.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      + dalších {weightRecords.length - 10} záznamů
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Injection Records */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Syringe className="w-4 h-4" />
                Injekce ({injectionRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {injectionRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné záznamy</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {injectionRecords.slice(0, 10).map((record) => {
                    const substance = substancesDB.find((s) => s.id === record.substanceId);
                    return (
                      <div
                        key={record._id}
                        className="flex justify-between items-center text-sm border-b border-border pb-1"
                      >
                        <span className="text-muted-foreground">
                          {new Date(record.date).toLocaleDateString("cs")}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            style={{ borderColor: substance?.color, color: substance?.color }}
                          >
                            {substance?.name || record.substanceId}
                          </Badge>
                          <span className="font-medium">{record.mg} mg</span>
                        </div>
                      </div>
                    );
                  })}
                  {injectionRecords.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      + dalších {injectionRecords.length - 10} záznamů
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Measure Records */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Měření těla ({measureRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {measureRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné záznamy</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {measureRecords.slice(0, 5).map((record) => (
                    <div key={record._id} className="text-sm border-b border-border pb-2">
                      <div className="font-medium text-muted-foreground mb-1">
                        {new Date(record.date).toLocaleDateString("cs")}
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        {record.waist && <span>Pas: {record.waist} cm</span>}
                        {record.hips && <span>Boky: {record.hips} cm</span>}
                        {record.chest && <span>Hrudník: {record.chest} cm</span>}
                        {record.arm && <span>Paže: {record.arm} cm</span>}
                        {record.thigh && <span>Stehno: {record.thigh} cm</span>}
                        {record.calf && <span>Lýtko: {record.calf} cm</span>}
                        {record.neck && <span>Krk: {record.neck} cm</span>}
                      </div>
                    </div>
                  ))}
                  {measureRecords.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      + dalších {measureRecords.length - 5} záznamů
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mood Records */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <SmilePlus className="w-4 h-4" />
                Deník nálad ({moodRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moodRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné záznamy</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {moodRecords.slice(0, 5).map((record) => (
                    <div key={record._id} className="text-sm border-b border-border pb-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">
                          {new Date(record.date).toLocaleDateString("cs")}
                        </span>
                        <span>{"⭐".repeat(record.rating)}</span>
                      </div>
                      {record.sideEffects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {record.sideEffects.map((effect) => (
                            <Badge key={effect} variant="secondary" className="text-xs">
                              {effect}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {record.note && (
                        <p className="text-xs text-muted-foreground italic">{record.note}</p>
                      )}
                    </div>
                  ))}
                  {moodRecords.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      + dalších {moodRecords.length - 5} záznamů
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Zásoby ({stockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné zásoby</p>
              ) : (
                <div className="space-y-2">
                  {stockItems.map((item) => {
                    const substance = substancesDB.find((s) => s.id === item.substanceId);
                    const percentage = (item.currentMg / item.totalMg) * 100;
                    return (
                      <div key={item._id} className="text-sm border-b border-border pb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">{item.name}</span>
                          <Badge
                            variant="outline"
                            style={{ borderColor: substance?.color, color: substance?.color }}
                          >
                            {item.isVial ? "Vialka" : "Pero"}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {item.currentMg.toFixed(1)} / {item.totalMg} mg
                          </span>
                          <span>{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  // Users list view
  const promoCodes = promoCodesResult?.ok ? promoCodesResult.codes : [];
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Administrace</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? "uživatel" : users.length < 5 ? "uživatelé" : "uživatelů"}
          </p>
        </div>
      </div>

      {/* Promo Codes Section */}
      <Card className="border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-500" />
            Promo kódy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generate new code */}
          <div className="flex gap-2">
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Vyber produkt" />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_PRODUCTS.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.title} ({product.durationMonths} {product.durationMonths === 1 ? "měsíc" : product.durationMonths < 5 ? "měsíce" : "měsíců"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleGenerateCode} 
              disabled={isGenerating}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Ticket className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">Generovat</span>
            </Button>
          </div>

          {/* Recent codes */}
          {promoCodes && promoCodes.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-auto">
              <p className="text-xs text-muted-foreground">Nedávné kódy:</p>
              {promoCodes.slice(0, 5).map((code: any) => (
                <div 
                  key={code._id} 
                  className="flex items-center justify-between text-sm py-1 px-2 bg-muted/30 rounded"
                >
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-bold text-amber-400">{code.code}</code>
                    <Badge variant="outline" className="text-xs">
                      {code.productTitle}
                    </Badge>
                    {code.usedBy && (
                      <Badge variant="secondary" className="text-xs">
                        Použito
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => handleCopyCode(code.code)}
                  >
                    {copiedCode === code.code ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <ScrollArea className="h-[calc(100vh-24rem)]">
        <div className="space-y-3">
          {users.map((user) => (
            <Card
              key={user._id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedUserId(user._id)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">
                      {user.name || user.surname
                        ? `${user.name || ""} ${user.surname || ""}`.trim()
                        : "Bez jména"}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {user.email || "Bez emailu"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {user.role === "admin" && (
                      <Badge variant="default" className="bg-primary">
                        Admin
                      </Badge>
                    )}
                    {user.premiumPermanent ? (
                      <Badge className="bg-amber-500">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium ∞
                      </Badge>
                    ) : user.premiumUntil && user.premiumUntil > Date.now() ? (
                      <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Weight className="w-3 h-3" />
                    {user.weightRecordsCount} vážení
                  </span>
                  <span className="flex items-center gap-1">
                    <Syringe className="w-3 h-3" />
                    {user.injectionRecordsCount} injekcí
                  </span>
                </div>

                {user.lastActivity && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Poslední aktivita: {new Date(user.lastActivity).toLocaleDateString("cs")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
