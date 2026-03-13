import { Router } from "express";
import { db } from "../db";

const router = Router();

// Process payment and upgrade account
router.post("/process", (req, res) => {
    const { userId, planId, cardLast4, amount } = req.body;
    
    if (!userId || !planId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Get the plan details
        const plan = db.prepare("SELECT * FROM TypesComptes WHERE id_type = ?").get(planId) as { id_type: number; nom_type: string } | undefined;
        
        if (!plan) {
            return res.status(404).json({ error: "Plan not found" });
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
        `).run(userId, amount || 0, `PAY-${Date.now()}-${cardLast4 || '0000'}`);

        // Update user account type
        db.prepare(`
            UPDATE Utilisateurs 
            SET type = ? 
            WHERE id_utilisateur = ?
        `).run(userType, userId);

        // Log the upgrade
        console.log(`User ${userId} upgraded to ${userType} (plan: ${plan.nom_type})`);

        res.json({ 
            success: true, 
            message: "Payment processed successfully",
            newType: userType
        });
    } catch (error) {
        console.error("Payment processing error:", error);
        res.status(500).json({ error: "Failed to process payment" });
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
