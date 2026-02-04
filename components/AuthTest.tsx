"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function AuthTest() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  
  // Tento query se pokusí vytáhnout data o aktuálním uživateli
  // Předpokládám, že máte v convex/users.ts funkci "viewer" nebo podobnou
  // Pokud ne, tento řádek zakomentujte.
  const me = useQuery(api.users.viewer); 

  if (isLoading) return <div className="p-4 bg-yellow-100">Načítám stav přihlášení...</div>;

  return (
    <div className="p-4 m-4 border-2 rounded-lg bg-slate-50 space-y-2 text-sm font-mono">
      <h3 className="font-bold text-lg mb-2">DEBUG: Stav autentizace</h3>
      
      <div className="flex gap-2">
        <span>Stav:</span>
        {isAuthenticated ? (
          <span className="text-green-600 font-bold">PŘIHLÁŠEN ✅</span>
        ) : (
          <span className="text-red-600 font-bold">ANONYMNÍ (Nepřihlášen) ❌</span>
        )}
      </div>

      {isAuthenticated && me && (
        <div className="mt-4 p-2 bg-white border rounded">
          <p className="font-bold border-b mb-1">Data z databáze:</p>
          <pre>{JSON.stringify(me, null, 2)}</pre>
        </div>
      )}
      
      {!me && isAuthenticated && (
        <p className="text-orange-500 italic">
          Jste přihlášen v Auth, ale záznam v tabulce "users" nebyl nalezen (nebo chybí query).
        </p>
      )}
    </div>
  );
}
