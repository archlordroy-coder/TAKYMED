import { Router } from "express";
import { db } from "../db";

const router = Router();

// Send OTP code for Orange Money payment
router.post("/send-otp", (req, res) => {
    const { phoneNumber, amount } = req.body;
    
    if (!phoneNumber || phoneNumber.length < 10) {
        return res.status(400).json({ error: "Numéro de téléphone invalide" });
    }
    
    try {
        // Generate OTP code (6 digits)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP temporarily (in production, use Redis or DB with TTL)
        // For demo purposes, we'll just log it
        console.log(`OTP for ${phoneNumber}: ${otpCode}`);
        
        // TODO: Integrate with actual Orange Money API
        // This would send SMS via Orange Money API
        // const orangeResponse = await orangeMoneyAPI.sendOTP(phoneNumber, otpCode, amount);
        
        res.json({ 
            success: true, 
            message: "Code OTP envoyé par SMS",
            // For demo only: return OTP in response
            otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined
        });
    } catch (error) {
        console.error("OTP sending error:", error);
        res.status(500).json({ error: "Échec de l'envoi du code OTP" });
    }
});

// Process payment and upgrade account
router.post("/process", (req, res) => {
    const { userId, planId, phoneNumber, otpCode, amount, method } = req.body;
    
    if (!userId || !planId || !phoneNumber || !otpCode) {
        return res.status(400).json({ error: "Champs requis manquants" });
    }
    
    if (method !== "orange_money") {
        return res.status(400).json({ error: "Méthode de paiement non supportée" });
    }
    
    try {
        // TODO: Verify OTP with Orange Money API
        // For demo purposes, we'll accept any 6-digit code
        if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
            return res.status(400).json({ error: "Code OTP invalide" });
        }
        
        // Get plan details
        const plan = db.prepare("SELECT * FROM TypesComptes WHERE id_type = ?").get(planId) as { id_type: number; nom_type: string } | undefined;
        
        if (!plan) {
            return res.status(404).json({ error: "Plan non trouvé" });
        }
        
        // Map plan name to user type
        const typeMap: Record<string, string> = {
            "Standard": "standard",
            "Pro": "professional",
            "Professionnel": "professional",
            "Pharmacien": "professional",
            "Administrateur": "admin"
        };
        
        const userType = typeMap[plan.nom_type] || "standard";
        
        // Create a payment record
        db.prepare(`
            INSERT INTO Paiements (id_utilisateur, montant, devise, statut, date_paiement, reference)
            VALUES (?, ?, 'FCFA', 'complete', CURRENT_TIMESTAMP, ?)
        `).run(userId, amount || 0, `ORANGE-${Date.now()}-${phoneNumber.slice(-4)}`);
        
        // Update user account type
        db.prepare(`
            UPDATE Utilisateurs 
            SET id_type_compte = ? 
            WHERE id_utilisateur = ?
        `).run(plan.id_type, userId);
        
        // Log upgrade
        console.log(`User ${userId} upgraded to ${userType} (plan: ${plan.nom_type}) via Orange Money`);
        
        res.json({ 
            success: true, 
            message: "Paiement Orange Money traité avec succès",
            newType: userType
        });
    } catch (error) {
        console.error("Payment processing error:", error);
        res.status(500).json({ error: "Échec du traitement du paiement" });
    }
});

// Get payment history for user
router.get("/history/:userId", (req, res) => {
    const { userId } = req.params;
    
    try {
        const payments = db.prepare(`
            SELECT id_paiement as id, montant as amount, devise as currency, statut as status, 
                   date_paiement as date, reference
            FROM Paiements
            WHERE id_utilisateur = ?
            ORDER BY date_paiement DESC
            LIMIT 20
        `).all(userId);
        
        res.json({ payments });
    } catch (error) {
        console.error("Failed to fetch payment history:", error);
        res.status(500).json({ error: "Failed to fetch payment history" });
    }
});

export const paymentRouter = router;
