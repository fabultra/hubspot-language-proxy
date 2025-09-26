// Fonction principale - Version simplifiée pour Vercel
import axios from 'axios';

export default async function handler(req, res) {
    const startTime = Date.now();
    
    // CORS headers pour tous les navigateurs
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Preflight CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Vérifier méthode
    if (req.method !== 'PATCH') {
        return res.status(405).json({
            error: 'METHOD_NOT_ALLOWED',
            message: 'Only PATCH method allowed'
        });
    }
    
    const { email, language } = req.body || {};
    
    try {
        // Validation email simple
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                error: 'INVALID_EMAIL',
                message: 'Valid email required'
            });
        }
        
        // Validation langue
        if (!language || !['fr', 'en'].includes(language)) {
            return res.status(400).json({
                error: 'INVALID_LANGUAGE',
                message: 'Language must be fr or en'
            });
        }
        
        // Token HubSpot
        const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
        if (!token) {
            return res.status(500).json({
                error: 'CONFIGURATION_ERROR',
                message: 'HubSpot token not configured'
            });
        }
        
        console.log(`Updating ${email} to ${language}`);
        
        // Appel HubSpot API
        const hubspotResponse = await axios.patch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
            {
                properties: {
                    hs_language: language
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        const responseTime = Date.now() - startTime;
        
        console.log(`SUCCESS: ${email} updated to ${language} in ${responseTime}ms`);
        
        return res.status(200).json({
            success: true,
            message: 'Language updated successfully',
            data: {
                email,
                language,
                contactId: hubspotResponse.data.id,
                responseTime
            }
        });
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        console.error(`ERROR: ${email} - ${error.message} (${responseTime}ms)`);
        
        // Gestion erreurs HubSpot
        if (error.response) {
            const status = error.response.status;
            
            switch (status) {
                case 404:
                    return res.status(404).json({
                        error: 'CONTACT_NOT_FOUND',
                        message: `Contact not found: ${email}`
                    });
                
                case 403:
                    return res.status(403).json({
                        error: 'INSUFFICIENT_PERMISSIONS',
                        message: 'HubSpot token lacks permissions'
                    });
                
                case 429:
                    return res.status(429).json({
                        error: 'RATE_LIMIT_EXCEEDED',
                        message: 'Too many requests, try again later'
                    });
                
                default:
                    return res.status(500).json({
                        error: 'HUBSPOT_API_ERROR',
                        message: `HubSpot API error: ${status}`
                    });
            }
        }
        
        // Erreurs réseau
        if (error.code === 'ECONNABORTED') {
            return res.status(408).json({
                error: 'TIMEOUT',
                message: 'Request timeout'
            });
        }
        
        return res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'Unexpected error occurred'
        });
    }
}
