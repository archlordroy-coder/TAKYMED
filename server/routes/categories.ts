import { Router } from "express";
import { db } from "../db";

const router = Router();

// Get all age categories
router.get("/", (_req, res) => {
    try {
        const categories = db.prepare(`
            SELECT id_categorie as id, nom_categorie as name, description
            FROM CategoriesAge
            ORDER BY id_categorie ASC
        `).all();
        res.json({ categories });
    } catch (error) {
        console.error("Failed to fetch age categories:", error);
        res.status(500).json({ error: "Failed to fetch age categories" });
    }
});

// Add a new category
router.post("/", (req, res) => {
    const { name, description, considerWeight } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    try {
        const info = db.prepare("INSERT INTO CategoriesAge (nom_categorie, description, considere_poids) VALUES (?, ?, ?)").run(name, description || "", considerWeight ? 1 : 0);
        res.status(201).json({ success: true, id: info.lastInsertRowid });
    } catch (error: any) {
        if (error.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({ error: "Category already exists" });
        }
        console.error("Failed to add category:", error);
        res.status(500).json({ error: "Failed to add category" });
    }
});

// Update a category
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    try {
        db.prepare("UPDATE CategoriesAge SET nom_categorie = ?, description = ? WHERE id_categorie = ?").run(name, description || "", id);
        res.json({ success: true });
    } catch (error: any) {
        if (error.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({ error: "Category name already exists" });
        }
        console.error("Failed to update category:", error);
        res.status(500).json({ error: "Failed to update category" });
    }
});

// Delete a category
router.delete("/:id", (req, res) => {
    const { id } = req.params;
    try {
        db.prepare("DELETE FROM CategoriesAge WHERE id_categorie = ?").run(id);
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to delete category:", error);
        res.status(500).json({ error: "Failed to delete category" });
    }
});

export const categoriesAgeRouter = router;
