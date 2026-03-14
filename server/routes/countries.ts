import { Router } from "express";
import CountryList from "country-list-with-dial-code-and-flag";

const router = Router();

// Get all countries with dial codes and flags
router.get("/", (_req, res) => {
    try {
        // Handle potential different export styles of the library
        const list = (CountryList as any).getAll ? (CountryList as any).getAll() : (CountryList as any).default?.getAll ? (CountryList as any).default.getAll() : [];

        // Remove duplicates by code (keep first occurrence)
        const seenCodes = new Set<string>();
        const countries = list
            .filter((c: any) => {
                if (seenCodes.has(c.code)) {
                    return false;
                }
                seenCodes.add(c.code);
                return true;
            })
            .map((c: any) => ({
                code: c.code,
                name: c.name,
                dialCode: c.dial_code,
                flag: c.flag
            }));
        
        // Sort by name
        countries.sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        res.json({ countries });
    } catch (error) {
        console.error("Failed to fetch countries:", error);
        res.status(500).json({ error: "Failed to fetch countries" });
    }
});

// Get country by code
router.get("/:code", (req, res) => {
    try {
        const { code } = req.params;
        const finder = (CountryList as any).findOneByCountryCode || (CountryList as any).default?.findOneByCountryCode;

        if (!finder) {
            return res.status(500).json({ error: "Country lookup not available" });
        }

        const country = finder(code.toUpperCase());
        
        if (!country) {
            return res.status(404).json({ error: "Country not found" });
        }
        
        res.json({
            code: country.code,
            name: country.name,
            dialCode: country.dial_code,
            flag: country.flag
        });
    } catch (error) {
        console.error("Failed to fetch country:", error);
        res.status(500).json({ error: "Failed to fetch country" });
    }
});

export const countriesRouter = router;
