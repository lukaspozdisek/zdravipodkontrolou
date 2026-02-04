import { convexAuth } from "@convex-dev/auth/server"
import { ResendOTP } from "./ResendOTP"
import { Password } from "@convex-dev/auth/providers/Password"
// 1. Importujte Google providera
import Google from "@auth/core/providers/google"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // 2. Přidejte Google do seznamu (automaticky si vezme AUTH_GOOGLE_ID a SECRET z environment variables)
  providers: [
    Google, 
    ResendOTP, 
    Password({ reset: ResendOTP, verify: ResendOTP })
  ],
})

