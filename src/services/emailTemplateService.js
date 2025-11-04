const db = require('../config/database');
const emailService = require('./emailService');

/**
 * Service de gestion des templates d'email
 */
class EmailTemplateService {
  constructor() {
    this.defaultTemplates = [
      {
        name: 'Newsletter Standard',
        category: 'newsletter',
        description: 'Template standard pour les newsletters',
        html_content: this.getNewsletterTemplate(),
        variables: ['title', 'content', 'products', 'unsubscribe_link']
      },
      {
        name: 'Promotion Flash',
        category: 'promotion',
        description: 'Template pour les promotions et offres spéciales',
        html_content: this.getPromotionTemplate(),
        variables: ['offer_title', 'discount_percentage', 'product_name', 'cta_link', 'expiry_date']
      },
      {
        name: 'Bienvenue',
        category: 'welcome',
        description: 'Template d\'accueil pour les nouveaux clients',
        html_content: this.getWelcomeTemplate(),
        variables: ['customer_name', 'welcome_offer', 'browse_link']
      },
      {
        name: 'Confirmation Commande',
        category: 'transactional',
        description: 'Template de confirmation de commande',
        html_content: this.getOrderConfirmationTemplate(),
        variables: ['order_number', 'customer_name', 'items', 'total', 'tracking_link']
      }
    ];
  }

  /**
   * Crée un nouveau template
   */
  async createTemplate(templateData, userId) {
    const {
      name,
      description,
      category,
      html_content,
      text_content,
      variables = [],
      is_default = false
    } = templateData;

    // Si c'est un template par défaut, désactiver les autres pour cette catégorie
    if (is_default) {
      await db('email_templates')
        .where('category', category)
        .where('created_by', userId)
        .update({ is_default: false });
    }

    const [template] = await db('email_templates').insert({
      name,
      description,
      category,
      html_content,
      text_content,
      variables: JSON.stringify(variables),
      is_default,
      is_active: true,
      created_by: userId
    }).returning('*');

    return {
      ...template,
      variables: JSON.parse(template.variables || '[]')
    };
  }

  /**
   * Met à jour un template existant
   */
  async updateTemplate(templateId, updateData, userId) {
    const template = await db('email_templates')
      .where('id', templateId)
      .where('created_by', userId)
      .first();

    if (!template) {
      throw new Error('Template non trouvé');
    }

    // Si on définit comme défaut, désactiver les autres
    if (updateData.is_default === true) {
      await db('email_templates')
        .where('category', template.category)
        .where('created_by', userId)
        .update({ is_default: false });
    }

    if (updateData.variables) {
      updateData.variables = JSON.stringify(updateData.variables);
    }

    const [updatedTemplate] = await db('email_templates')
      .where('id', templateId)
      .update(updateData)
      .returning('*');

    return {
      ...updatedTemplate,
      variables: JSON.parse(updatedTemplate.variables || '[]')
    };
  }

  /**
   * Supprime un template
   */
  async deleteTemplate(templateId, userId) {
    const deleted = await db('email_templates')
      .where('id', templateId)
      .where('created_by', userId)
      .del();

    if (!deleted) {
      throw new Error('Template non trouvé');
    }

    return true;
  }

  /**
   * Récupère tous les templates d'un utilisateur
   */
  async getUserTemplates(userId, category = null) {
    let query = db('email_templates')
      .where('created_by', userId)
      .where('is_active', true);

    if (category) {
      query = query.where('category', category);
    }

    const templates = await query
      .orderBy('category')
      .orderBy('is_default', 'desc')
      .orderBy('name')
      .select('*');

    return templates.map(template => ({
      ...template,
      variables: JSON.parse(template.variables || '[]')
    }));
  }

  /**
   * Récupère un template spécifique
   */
  async getTemplate(templateId, userId) {
    const template = await db('email_templates')
      .where('id', templateId)
      .where('created_by', userId)
      .first();

    if (!template) {
      throw new Error('Template non trouvé');
    }

    return {
      ...template,
      variables: JSON.parse(template.variables || '[]')
    };
  }

  /**
   * Compile un template avec des variables
   */
  compileTemplate(htmlContent, variables = {}) {
    let compiled = htmlContent;

    // Remplacer les variables dans le format {{variable}}
    for (let [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      compiled = compiled.replace(regex, value || '');
    }

    return compiled;
  }

  /**
   * Prévisualise un template avec des données d'exemple
   */
  async previewTemplate(templateId, userId, sampleData = {}) {
    const template = await this.getTemplate(templateId, userId);
    
    const defaultSampleData = {
      title: 'Titre d\'exemple',
      customer_name: 'Jean Dupont',
      content: 'Contenu d\'exemple pour la prévisualisation',
      offer_title: 'Offre spéciale -50%',
      discount_percentage: '50',
      product_name: 'Produit Example',
      cta_link: '#',
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      unsubscribe_link: '#unsubscribe',
      order_number: 'CMD-12345',
      total: '99.99€',
      browse_link: '#browse',
      welcome_offer: 'Bienvenue ! Profitez de -20% sur votre première commande',
      tracking_link: '#tracking',
      items: 'Article 1, Article 2, Article 3'
    };

    const mergedData = { ...defaultSampleData, ...sampleData };
    const compiledHtml = this.compileTemplate(template.html_content, mergedData);

    return {
      template,
      compiled_html: compiledHtml,
      sample_data: mergedData
    };
  }

  /**
   * Initialise les templates par défaut pour un utilisateur
   */
  async initializeDefaultTemplates(userId) {
    const existingTemplates = await db('email_templates')
      .where('created_by', userId)
      .select('category');

    const existingCategories = existingTemplates.map(t => t.category);

    const templatesToCreate = this.defaultTemplates.filter(
      template => !existingCategories.includes(template.category)
    );

    const createdTemplates = [];

    for (let templateData of templatesToCreate) {
      try {
        const template = await this.createTemplate({
          ...templateData,
          is_default: true
        }, userId);
        createdTemplates.push(template);
      } catch (error) {
        console.error(`Erreur création template ${templateData.name}:`, error);
      }
    }

    return createdTemplates;
  }

  // ================= TEMPLATES HTML =================

  getNewsletterTemplate() {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .btn { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .product { border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛍️ AfrikMode</h1>
            <h2>{{title}}</h2>
        </div>
        
        <div class="content">
            <p>Bonjour,</p>
            <div>{{content}}</div>
            
            <div class="product-grid">
                {{products}}
            </div>
            
            <p style="text-align: center;">
                <a href="#" class="btn">Voir toute la collection</a>
            </p>
        </div>
        
        <div class="footer">
            <p>© 2025 AfrikMode - Plateforme E-commerce</p>
            <p><a href="{{unsubscribe_link}}">Se désabonner</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  getPromotionTemplate() {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{offer_title}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 40px; text-align: center; }
        .offer-badge { background: rgba(255,255,255,0.2); border: 2px solid white; border-radius: 50%; width: 120px; height: 120px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
        .content { padding: 30px; text-align: center; }
        .cta-button { display: inline-block; padding: 20px 40px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 50px; font-size: 18px; font-weight: bold; margin: 20px 0; }
        .expiry { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="offer-badge">
                -{{discount_percentage}}%
            </div>
            <h1>{{offer_title}}</h1>
        </div>
        
        <div class="content">
            <h2>🔥 {{product_name}}</h2>
            <p>Ne manquez pas cette offre exceptionnelle !</p>
            
            <a href="{{cta_link}}" class="cta-button">Profiter de l'offre</a>
            
            <div class="expiry">
                ⏰ Offre valable jusqu'au {{expiry_date}}
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
            <p>© 2025 AfrikMode - Plateforme E-commerce</p>
        </div>
    </div>
</body>
</html>`;
  }

  getWelcomeTemplate() {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue chez AfrikMode</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
        .content { padding: 30px; }
        .welcome-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
        .btn { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 25px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bienvenue {{customer_name}} !</h1>
            <p>Merci de nous avoir rejoint</p>
        </div>
        
        <div class="content">
            <div class="welcome-box">
                <h3>🎁 {{welcome_offer}}</h3>
            </div>
            
            <p>Découvrez notre collection unique de mode africaine et trouvez les pièces qui vous ressemblent.</p>
            
            <p style="text-align: center;">
                <a href="{{browse_link}}" class="btn">Commencer mes achats</a>
            </p>
            
            <p>À bientôt sur AfrikMode !</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
            <p>© 2025 AfrikMode - Plateforme E-commerce</p>
        </div>
    </div>
</body>
</html>`;
  }

  getOrderConfirmationTemplate() {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation de commande</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .order-box { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .btn { display: inline-block; padding: 12px 25px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Commande confirmée</h1>
            <p>Merci {{customer_name}} !</p>
        </div>
        
        <div class="content">
            <div class="order-box">
                <h3>Commande #{{order_number}}</h3>
                <p><strong>Articles:</strong> {{items}}</p>
                <p><strong>Total:</strong> {{total}}</p>
            </div>
            
            <p>Votre commande est en cours de préparation. Vous recevrez un email de confirmation d'expédition dès qu'elle sera envoyée.</p>
            
            <p style="text-align: center;">
                <a href="{{tracking_link}}" class="btn">Suivre ma commande</a>
            </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
            <p>© 2025 AfrikMode - Plateforme E-commerce</p>
        </div>
    </div>
</body>
</html>`;
  }
}

module.exports = new EmailTemplateService();