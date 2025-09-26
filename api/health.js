// Health check simple pour Vercel
export default function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'HubSpot Language Proxy',
        version: '2.0.0'
    };
    
    // Vérifier si le token HubSpot est configuré
    if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
        health.status = 'configuration_missing';
        health.warning = 'HubSpot token not configured';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
}
