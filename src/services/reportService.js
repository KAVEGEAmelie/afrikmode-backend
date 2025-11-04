const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

class ReportService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../exports/reports');
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Génère un rapport de ventes
   */
  async generateSalesReport(filters = {}, format = 'pdf') {
    const data = await this.getSalesData(filters);
    
    switch (format.toLowerCase()) {
      case 'pdf':
        return await this.generateSalesPDF(data, filters);
      case 'xlsx':
      case 'excel':
        return await this.generateSalesExcel(data, filters);
      case 'csv':
        return await this.generateSalesCSV(data, filters);
      default:
        throw new Error(`Format non supporté: ${format}`);
    }
  }

  /**
   * Génère un rapport d'inventaire
   */
  async generateInventoryReport(filters = {}, format = 'pdf') {
    const data = await this.getInventoryData(filters);
    
    switch (format.toLowerCase()) {
      case 'pdf':
        return await this.generateInventoryPDF(data, filters);
      case 'xlsx':
      case 'excel':
        return await this.generateInventoryExcel(data, filters);
      case 'csv':
        return await this.generateInventoryCSV(data, filters);
      default:
        throw new Error(`Format non supporté: ${format}`);
    }
  }

  /**
   * Génère un rapport clients
   */
  async generateCustomersReport(filters = {}, format = 'pdf') {
    const data = await this.getCustomersData(filters);
    
    switch (format.toLowerCase()) {
      case 'pdf':
        return await this.generateCustomersPDF(data, filters);
      case 'xlsx':
      case 'excel':
        return await this.generateCustomersExcel(data, filters);
      case 'csv':
        return await this.generateCustomersCSV(data, filters);
      default:
        throw new Error(`Format non supporté: ${format}`);
    }
  }

  /**
   * Génère un rapport de commandes
   */
  async generateOrdersReport(filters = {}, format = 'pdf') {
    const data = await this.getOrdersData(filters);
    
    switch (format.toLowerCase()) {
      case 'pdf':
        return await this.generateOrdersPDF(data, filters);
      case 'xlsx':
      case 'excel':
        return await this.generateOrdersExcel(data, filters);
      case 'csv':
        return await this.generateOrdersCSV(data, filters);
      default:
        throw new Error(`Format non supporté: ${format}`);
    }
  }

  // =================== RÉCUPÉRATION DES DONNÉES ===================

  async getSalesData(filters) {
    let query = db('orders')
      .join('users', 'orders.user_id', 'users.id')
      .join('stores', 'orders.store_id', 'stores.id')
      .leftJoin('payments', 'orders.id', 'payments.order_id')
      .select(
        'orders.id',
        'orders.order_number',
        'orders.total_amount',
        'orders.status',
        'orders.created_at',
        'users.first_name',
        'users.last_name',
        'users.email',
        'stores.name as store_name',
        'payments.payment_method',
        'payments.payment_status'
      );

    // Appliquer les filtres
    if (filters.start_date) {
      query = query.where('orders.created_at', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('orders.created_at', '<=', filters.end_date);
    }
    if (filters.store_id) {
      query = query.where('orders.store_id', filters.store_id);
    }
    if (filters.status) {
      query = query.where('orders.status', filters.status);
    }

    const orders = await query.orderBy('orders.created_at', 'desc');

    // Calculer les statistiques
    const stats = await this.getSalesStats(filters);

    return {
      orders,
      stats,
      period: {
        start: filters.start_date,
        end: filters.end_date
      }
    };
  }

  async getSalesStats(filters) {
    let query = db('orders');

    if (filters.start_date) {
      query = query.where('created_at', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('created_at', '<=', filters.end_date);
    }
    if (filters.store_id) {
      query = query.where('store_id', filters.store_id);
    }

    const stats = await query
      .select(
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total_amount) as total_revenue'),
        db.raw('AVG(total_amount) as average_order_value'),
        db.raw('COUNT(DISTINCT user_id) as unique_customers')
      )
      .first();

    return stats;
  }

  async getInventoryData(filters) {
    let query = db('products')
      .join('stores', 'products.store_id', 'stores.id')
      .join('categories', 'products.category_id', 'categories.id')
      .select(
        'products.id',
        'products.name',
        'products.sku',
        'products.price',
        'products.stock_quantity',
        'products.status',
        'products.created_at',
        'stores.name as store_name',
        'categories.name as category_name'
      );

    if (filters.store_id) {
      query = query.where('products.store_id', filters.store_id);
    }
    if (filters.category_id) {
      query = query.where('products.category_id', filters.category_id);
    }
    if (filters.low_stock) {
      query = query.where('products.stock_quantity', '<', 10);
    }
    if (filters.status) {
      query = query.where('products.status', filters.status);
    }

    const products = await query.orderBy('products.name', 'asc');

    // Statistiques d'inventaire
    const stats = await this.getInventoryStats(filters);

    return {
      products,
      stats
    };
  }

  async getInventoryStats(filters) {
    let query = db('products');

    if (filters.store_id) {
      query = query.where('store_id', filters.store_id);
    }
    if (filters.category_id) {
      query = query.where('category_id', filters.category_id);
    }

    const stats = await query
      .select(
        db.raw('COUNT(*) as total_products'),
        db.raw('SUM(stock_quantity) as total_stock'),
        db.raw('SUM(price * stock_quantity) as inventory_value'),
        db.raw('COUNT(CASE WHEN stock_quantity < 10 THEN 1 END) as low_stock_products')
      )
      .first();

    return stats;
  }

  async getCustomersData(filters) {
    let query = db('users')
      .leftJoin(
        db('orders').select('user_id').count('* as order_count').sum('total_amount as total_spent').groupBy('user_id').as('order_stats'),
        'users.id', 'order_stats.user_id'
      )
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.phone',
        'users.created_at',
        'users.updated_at',
        db.raw('COALESCE(order_stats.order_count, 0) as order_count'),
        db.raw('COALESCE(order_stats.total_spent, 0) as total_spent')
      )
      .where('users.role', 'customer');

    if (filters.start_date) {
      query = query.where('users.created_at', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('users.created_at', '<=', filters.end_date);
    }

    const customers = await query.orderBy('users.created_at', 'desc');

    const stats = await this.getCustomersStats(filters);

    return {
      customers,
      stats
    };
  }

  async getCustomersStats(filters) {
    let query = db('users').where('role', 'customer');

    if (filters.start_date) {
      query = query.where('created_at', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('created_at', '<=', filters.end_date);
    }

    const stats = await query
      .select(
        db.raw('COUNT(*) as total_customers')
      )
      .first();

    // Clients actifs (ayant passé au moins une commande)
    const activeCustomers = await db('users')
      .join('orders', 'users.id', 'orders.user_id')
      .where('users.role', 'customer')
      .countDistinct('users.id as active_customers')
      .first();

    return {
      ...stats,
      ...activeCustomers
    };
  }

  async getOrdersData(filters) {
    let query = db('orders')
      .join('users', 'orders.user_id', 'users.id')
      .join('stores', 'orders.store_id', 'stores.id')
      .leftJoin('payments', 'orders.id', 'payments.order_id')
      .select(
        'orders.id',
        'orders.order_number',
        'orders.total_amount',
        'orders.status',
        'orders.created_at',
        'orders.updated_at',
        'users.first_name',
        'users.last_name',
        'users.email',
        'stores.name as store_name',
        'payments.payment_method',
        'payments.payment_status'
      );

    if (filters.start_date) {
      query = query.where('orders.created_at', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('orders.created_at', '<=', filters.end_date);
    }
    if (filters.store_id) {
      query = query.where('orders.store_id', filters.store_id);
    }
    if (filters.status) {
      query = query.where('orders.status', filters.status);
    }

    const orders = await query.orderBy('orders.created_at', 'desc');

    // Récupérer les items pour chaque commande si demandé
    if (filters.include_items) {
      for (let order of orders) {
        order.items = await db('order_items')
          .join('products', 'order_items.product_id', 'products.id')
          .select(
            'order_items.*',
            'products.name as product_name',
            'products.sku'
          )
          .where('order_items.order_id', order.id);
      }
    }

    const stats = await this.getOrdersStats(filters);

    return {
      orders,
      stats
    };
  }

  async getOrdersStats(filters) {
    let query = db('orders');

    if (filters.start_date) {
      query = query.where('created_at', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('created_at', '<=', filters.end_date);
    }
    if (filters.store_id) {
      query = query.where('store_id', filters.store_id);
    }

    const stats = await query
      .select(
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total_amount) as total_amount'),
        db.raw('AVG(total_amount) as average_order_value')
      )
      .first();

    // Stats par statut
    const statusStats = await query.clone()
      .select('status')
      .count('* as count')
      .groupBy('status');

    stats.by_status = statusStats.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {});

    return stats;
  }

  // =================== GÉNÉRATION PDF ===================

  async generateSalesPDF(data, filters) {
    const fileName = `sales_report_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // En-tête
        doc.fontSize(20).text('RAPPORT DES VENTES', 50, 50);
        doc.fontSize(12).text('AfrikMode - Plateforme E-commerce', 50, 80);
        
        if (data.period.start || data.period.end) {
          const period = `Période: ${data.period.start ? new Date(data.period.start).toLocaleDateString('fr-FR') : 'Début'} - ${data.period.end ? new Date(data.period.end).toLocaleDateString('fr-FR') : 'Fin'}`;
          doc.text(period, 50, 100);
        }

        doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 50, 120);

        // Statistiques
        let yPos = 160;
        doc.fontSize(16).text('RÉSUMÉ EXÉCUTIF', 50, yPos);
        yPos += 30;

        doc.fontSize(12);
        doc.text(`Nombre total de commandes: ${data.stats.total_orders || 0}`, 50, yPos);
        yPos += 20;
        doc.text(`Chiffre d'affaires total: ${parseFloat(data.stats.total_revenue || 0).toFixed(2)} €`, 50, yPos);
        yPos += 20;
        doc.text(`Panier moyen: ${parseFloat(data.stats.average_order_value || 0).toFixed(2)} €`, 50, yPos);
        yPos += 20;
        doc.text(`Clients uniques: ${data.stats.unique_customers || 0}`, 50, yPos);
        yPos += 40;

        // Tableau des commandes
        doc.fontSize(14).text('DÉTAIL DES COMMANDES', 50, yPos);
        yPos += 30;

        // En-têtes du tableau
        doc.fontSize(10);
        doc.text('N° Commande', 50, yPos);
        doc.text('Client', 150, yPos);
        doc.text('Boutique', 250, yPos);
        doc.text('Montant', 350, yPos);
        doc.text('Statut', 420, yPos);
        doc.text('Date', 480, yPos);
        yPos += 20;

        // Ligne de séparation
        doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 10;

        // Données du tableau
        for (let order of data.orders.slice(0, 30)) { // Limiter à 30 pour éviter les pages trop longues
          doc.text(order.order_number || '', 50, yPos);
          doc.text(`${order.first_name} ${order.last_name}`, 150, yPos);
          doc.text(order.store_name || '', 250, yPos);
          doc.text(`${parseFloat(order.total_amount).toFixed(2)} €`, 350, yPos);
          doc.text(order.status || '', 420, yPos);
          doc.text(new Date(order.created_at).toLocaleDateString('fr-FR'), 480, yPos);
          yPos += 15;

          if (yPos > 750) { // Nouvelle page si nécessaire
            doc.addPage();
            yPos = 50;
          }
        }

        if (data.orders.length > 30) {
          yPos += 20;
          doc.text(`... et ${data.orders.length - 30} autres commandes`, 50, yPos);
        }

        doc.end();

        stream.on('finish', () => {
          resolve({
            fileName,
            filePath,
            fileSize: fs.statSync(filePath).size
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateInventoryPDF(data, filters) {
    const fileName = `inventory_report_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // En-tête
        doc.fontSize(20).text('RAPPORT D\'INVENTAIRE', 50, 50);
        doc.fontSize(12).text('AfrikMode - Plateforme E-commerce', 50, 80);
        doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 50, 100);

        // Statistiques
        let yPos = 140;
        doc.fontSize(16).text('RÉSUMÉ INVENTAIRE', 50, yPos);
        yPos += 30;

        doc.fontSize(12);
        doc.text(`Nombre total de produits: ${data.stats.total_products || 0}`, 50, yPos);
        yPos += 20;
        doc.text(`Stock total: ${data.stats.total_stock || 0} unités`, 50, yPos);
        yPos += 20;
        doc.text(`Valeur inventaire: ${parseFloat(data.stats.inventory_value || 0).toFixed(2)} €`, 50, yPos);
        yPos += 20;
        doc.text(`Produits en rupture (<10): ${data.stats.low_stock_products || 0}`, 50, yPos);
        yPos += 40;

        // Tableau des produits
        doc.fontSize(14).text('DÉTAIL DES PRODUITS', 50, yPos);
        yPos += 30;

        // En-têtes du tableau
        doc.fontSize(10);
        doc.text('SKU', 50, yPos);
        doc.text('Nom', 120, yPos);
        doc.text('Catégorie', 250, yPos);
        doc.text('Stock', 320, yPos);
        doc.text('Prix', 370, yPos);
        doc.text('Valeur', 420, yPos);
        doc.text('Statut', 480, yPos);
        yPos += 20;

        // Ligne de séparation
        doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 10;

        // Données du tableau
        for (let product of data.products.slice(0, 35)) {
          doc.text(product.sku || '', 50, yPos);
          doc.text(product.name.substring(0, 20) || '', 120, yPos);
          doc.text(product.category_name || '', 250, yPos);
          doc.text(product.stock_quantity?.toString() || '0', 320, yPos);
          doc.text(`${parseFloat(product.price).toFixed(2)}€`, 370, yPos);
          doc.text(`${(parseFloat(product.price) * parseInt(product.stock_quantity)).toFixed(2)}€`, 420, yPos);
          doc.text(product.status || '', 480, yPos);
          yPos += 15;

          if (yPos > 750) {
            doc.addPage();
            yPos = 50;
          }
        }

        if (data.products.length > 35) {
          yPos += 20;
          doc.text(`... et ${data.products.length - 35} autres produits`, 50, yPos);
        }

        doc.end();

        stream.on('finish', () => {
          resolve({
            fileName,
            filePath,
            fileSize: fs.statSync(filePath).size
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateCustomersPDF(data, filters) {
    const fileName = `customers_report_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // En-tête
        doc.fontSize(20).text('RAPPORT CLIENTS', 50, 50);
        doc.fontSize(12).text('AfrikMode - Plateforme E-commerce', 50, 80);
        doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 50, 100);

        // Statistiques
        let yPos = 140;
        doc.fontSize(16).text('RÉSUMÉ CLIENTS', 50, yPos);
        yPos += 30;

        doc.fontSize(12);
        doc.text(`Nombre total de clients: ${data.stats.total_customers || 0}`, 50, yPos);
        yPos += 20;
        doc.text(`Clients actifs: ${data.stats.active_customers || 0}`, 50, yPos);
        yPos += 40;

        // Tableau des clients
        doc.fontSize(14).text('DÉTAIL DES CLIENTS', 50, yPos);
        yPos += 30;

        // En-têtes du tableau
        doc.fontSize(10);
        doc.text('Nom', 50, yPos);
        doc.text('Email', 150, yPos);
        doc.text('Téléphone', 280, yPos);
        doc.text('Commandes', 350, yPos);
        doc.text('Total dépensé', 420, yPos);
        doc.text('Inscrit le', 490, yPos);
        yPos += 20;

        // Ligne de séparation
        doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 10;

        // Données du tableau
        for (let customer of data.customers.slice(0, 35)) {
          doc.text(`${customer.first_name} ${customer.last_name}`, 50, yPos);
          doc.text(customer.email || '', 150, yPos);
          doc.text(customer.phone || '', 280, yPos);
          doc.text(customer.order_count?.toString() || '0', 350, yPos);
          doc.text(`${parseFloat(customer.total_spent || 0).toFixed(2)}€`, 420, yPos);
          doc.text(new Date(customer.created_at).toLocaleDateString('fr-FR'), 490, yPos);
          yPos += 15;

          if (yPos > 750) {
            doc.addPage();
            yPos = 50;
          }
        }

        if (data.customers.length > 35) {
          yPos += 20;
          doc.text(`... et ${data.customers.length - 35} autres clients`, 50, yPos);
        }

        doc.end();

        stream.on('finish', () => {
          resolve({
            fileName,
            filePath,
            fileSize: fs.statSync(filePath).size
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateOrdersPDF(data, filters) {
    const fileName = `orders_report_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // En-tête
        doc.fontSize(20).text('RAPPORT COMMANDES', 50, 50);
        doc.fontSize(12).text('AfrikMode - Plateforme E-commerce', 50, 80);
        doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 50, 100);

        // Statistiques
        let yPos = 140;
        doc.fontSize(16).text('RÉSUMÉ COMMANDES', 50, yPos);
        yPos += 30;

        doc.fontSize(12);
        doc.text(`Nombre total de commandes: ${data.stats.total_orders || 0}`, 50, yPos);
        yPos += 20;
        doc.text(`Montant total: ${parseFloat(data.stats.total_amount || 0).toFixed(2)} €`, 50, yPos);
        yPos += 20;
        doc.text(`Panier moyen: ${parseFloat(data.stats.average_order_value || 0).toFixed(2)} €`, 50, yPos);
        yPos += 30;

        // Répartition par statut
        doc.text('Répartition par statut:', 50, yPos);
        yPos += 20;
        for (let [status, count] of Object.entries(data.stats.by_status || {})) {
          doc.text(`  - ${status}: ${count}`, 70, yPos);
          yPos += 15;
        }
        yPos += 20;

        // Tableau des commandes
        doc.fontSize(14).text('DÉTAIL DES COMMANDES', 50, yPos);
        yPos += 30;

        // En-têtes du tableau
        doc.fontSize(10);
        doc.text('N° Commande', 50, yPos);
        doc.text('Client', 140, yPos);
        doc.text('Boutique', 240, yPos);
        doc.text('Montant', 320, yPos);
        doc.text('Statut', 380, yPos);
        doc.text('Paiement', 440, yPos);
        doc.text('Date', 500, yPos);
        yPos += 20;

        // Ligne de séparation
        doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 10;

        // Données du tableau
        for (let order of data.orders.slice(0, 30)) {
          doc.text(order.order_number || '', 50, yPos);
          doc.text(`${order.first_name} ${order.last_name}`, 140, yPos);
          doc.text(order.store_name || '', 240, yPos);
          doc.text(`${parseFloat(order.total_amount).toFixed(2)}€`, 320, yPos);
          doc.text(order.status || '', 380, yPos);
          doc.text(order.payment_method || '', 440, yPos);
          doc.text(new Date(order.created_at).toLocaleDateString('fr-FR'), 500, yPos);
          yPos += 15;

          if (yPos > 750) {
            doc.addPage();
            yPos = 50;
          }
        }

        if (data.orders.length > 30) {
          yPos += 20;
          doc.text(`... et ${data.orders.length - 30} autres commandes`, 50, yPos);
        }

        doc.end();

        stream.on('finish', () => {
          resolve({
            fileName,
            filePath,
            fileSize: fs.statSync(filePath).size
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // =================== GÉNÉRATION EXCEL ===================

  async generateSalesExcel(data, filters) {
    const fileName = `sales_report_${Date.now()}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);

    const workbook = XLSX.utils.book_new();

    // Feuille résumé
    const summaryData = [
      ['RAPPORT DES VENTES - AFRIKMODE'],
      ['Généré le', new Date().toLocaleDateString('fr-FR')],
      [''],
      ['RÉSUMÉ EXÉCUTIF'],
      ['Nombre total de commandes', data.stats.total_orders || 0],
      ['Chiffre d\'affaires total', `${parseFloat(data.stats.total_revenue || 0).toFixed(2)} €`],
      ['Panier moyen', `${parseFloat(data.stats.average_order_value || 0).toFixed(2)} €`],
      ['Clients uniques', data.stats.unique_customers || 0]
    ];

    if (data.period.start || data.period.end) {
      summaryData.splice(2, 0, ['Période', `${data.period.start ? new Date(data.period.start).toLocaleDateString('fr-FR') : 'Début'} - ${data.period.end ? new Date(data.period.end).toLocaleDateString('fr-FR') : 'Fin'}`]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // Feuille détail des commandes
    const ordersData = [
      ['N° Commande', 'Prénom', 'Nom', 'Email', 'Boutique', 'Montant', 'Statut', 'Méthode paiement', 'Statut paiement', 'Date création']
    ];

    data.orders.forEach(order => {
      ordersData.push([
        order.order_number || '',
        order.first_name || '',
        order.last_name || '',
        order.email || '',
        order.store_name || '',
        parseFloat(order.total_amount).toFixed(2),
        order.status || '',
        order.payment_method || '',
        order.payment_status || '',
        new Date(order.created_at).toLocaleDateString('fr-FR')
      ]);
    });

    const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Commandes');

    XLSX.writeFile(workbook, filePath);

    return {
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size
    };
  }

  async generateInventoryExcel(data, filters) {
    const fileName = `inventory_report_${Date.now()}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);

    const workbook = XLSX.utils.book_new();

    // Feuille résumé
    const summaryData = [
      ['RAPPORT D\'INVENTAIRE - AFRIKMODE'],
      ['Généré le', new Date().toLocaleDateString('fr-FR')],
      [''],
      ['RÉSUMÉ INVENTAIRE'],
      ['Nombre total de produits', data.stats.total_products || 0],
      ['Stock total', `${data.stats.total_stock || 0} unités`],
      ['Valeur inventaire', `${parseFloat(data.stats.inventory_value || 0).toFixed(2)} €`],
      ['Produits en rupture (<10)', data.stats.low_stock_products || 0]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // Feuille détail des produits
    const productsData = [
      ['SKU', 'Nom', 'Boutique', 'Catégorie', 'Prix', 'Stock', 'Valeur totale', 'Statut', 'Date création']
    ];

    data.products.forEach(product => {
      productsData.push([
        product.sku || '',
        product.name || '',
        product.store_name || '',
        product.category_name || '',
        parseFloat(product.price).toFixed(2),
        product.stock_quantity || 0,
        (parseFloat(product.price) * parseInt(product.stock_quantity || 0)).toFixed(2),
        product.status || '',
        new Date(product.created_at).toLocaleDateString('fr-FR')
      ]);
    });

    const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Produits');

    XLSX.writeFile(workbook, filePath);

    return {
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size
    };
  }

  async generateCustomersExcel(data, filters) {
    const fileName = `customers_report_${Date.now()}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);

    const workbook = XLSX.utils.book_new();

    // Feuille résumé
    const summaryData = [
      ['RAPPORT CLIENTS - AFRIKMODE'],
      ['Généré le', new Date().toLocaleDateString('fr-FR')],
      [''],
      ['RÉSUMÉ CLIENTS'],
      ['Nombre total de clients', data.stats.total_customers || 0],
      ['Clients actifs', data.stats.active_customers || 0]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // Feuille détail des clients
    const customersData = [
      ['Prénom', 'Nom', 'Email', 'Téléphone', 'Nombre de commandes', 'Total dépensé', 'Date inscription', 'Dernière activité']
    ];

    data.customers.forEach(customer => {
      customersData.push([
        customer.first_name || '',
        customer.last_name || '',
        customer.email || '',
        customer.phone || '',
        customer.order_count || 0,
        parseFloat(customer.total_spent || 0).toFixed(2),
        new Date(customer.created_at).toLocaleDateString('fr-FR'),
        new Date(customer.updated_at).toLocaleDateString('fr-FR')
      ]);
    });

    const customersSheet = XLSX.utils.aoa_to_sheet(customersData);
    XLSX.utils.book_append_sheet(workbook, customersSheet, 'Clients');

    XLSX.writeFile(workbook, filePath);

    return {
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size
    };
  }

  async generateOrdersExcel(data, filters) {
    const fileName = `orders_report_${Date.now()}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);

    const workbook = XLSX.utils.book_new();

    // Feuille résumé
    const summaryData = [
      ['RAPPORT COMMANDES - AFRIKMODE'],
      ['Généré le', new Date().toLocaleDateString('fr-FR')],
      [''],
      ['RÉSUMÉ COMMANDES'],
      ['Nombre total de commandes', data.stats.total_orders || 0],
      ['Montant total', `${parseFloat(data.stats.total_amount || 0).toFixed(2)} €`],
      ['Panier moyen', `${parseFloat(data.stats.average_order_value || 0).toFixed(2)} €`],
      [''],
      ['RÉPARTITION PAR STATUT']
    ];

    for (let [status, count] of Object.entries(data.stats.by_status || {})) {
      summaryData.push([status, count]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // Feuille détail des commandes
    const ordersData = [
      ['N° Commande', 'Prénom client', 'Nom client', 'Email', 'Boutique', 'Montant', 'Statut', 'Méthode paiement', 'Statut paiement', 'Date création', 'Dernière MAJ']
    ];

    data.orders.forEach(order => {
      ordersData.push([
        order.order_number || '',
        order.first_name || '',
        order.last_name || '',
        order.email || '',
        order.store_name || '',
        parseFloat(order.total_amount).toFixed(2),
        order.status || '',
        order.payment_method || '',
        order.payment_status || '',
        new Date(order.created_at).toLocaleDateString('fr-FR'),
        new Date(order.updated_at).toLocaleDateString('fr-FR')
      ]);
    });

    const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Commandes');

    // Si les items sont inclus, créer une feuille séparée
    if (filters.include_items && data.orders.some(order => order.items)) {
      const itemsData = [
        ['N° Commande', 'SKU Produit', 'Nom Produit', 'Quantité', 'Prix unitaire', 'Total ligne']
      ];

      data.orders.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            itemsData.push([
              order.order_number || '',
              item.sku || '',
              item.product_name || '',
              item.quantity || 0,
              parseFloat(item.unit_price || 0).toFixed(2),
              (parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0)).toFixed(2)
            ]);
          });
        }
      });

      const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Articles');
    }

    XLSX.writeFile(workbook, filePath);

    return {
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size
    };
  }

  // =================== GÉNÉRATION CSV ===================

  async generateSalesCSV(data, filters) {
    const fileName = `sales_report_${Date.now()}.csv`;
    const filePath = path.join(this.reportsDir, fileName);

    const csvData = [
      ['N° Commande', 'Prénom', 'Nom', 'Email', 'Boutique', 'Montant', 'Statut', 'Méthode paiement', 'Statut paiement', 'Date création']
    ];

    data.orders.forEach(order => {
      csvData.push([
        order.order_number || '',
        order.first_name || '',
        order.last_name || '',
        order.email || '',
        order.store_name || '',
        parseFloat(order.total_amount).toFixed(2),
        order.status || '',
        order.payment_method || '',
        order.payment_status || '',
        new Date(order.created_at).toLocaleDateString('fr-FR')
      ]);
    });

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    fs.writeFileSync(filePath, csvContent);

    return {
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size
    };
  }

  async generateInventoryCSV(data, filters) {
    const fileName = `inventory_report_${Date.now()}.csv`;
    const filePath = path.join(this.reportsDir, fileName);

    const csvData = [
      ['SKU', 'Nom', 'Boutique', 'Catégorie', 'Prix', 'Stock', 'Valeur totale', 'Statut', 'Date création']
    ];

    data.products.forEach(product => {
      csvData.push([
        product.sku || '',
        product.name || '',
        product.store_name || '',
        product.category_name || '',
        parseFloat(product.price).toFixed(2),
        product.stock_quantity || 0,
        (parseFloat(product.price) * parseInt(product.stock_quantity || 0)).toFixed(2),
        product.status || '',
        new Date(product.created_at).toLocaleDateString('fr-FR')
      ]);
    });

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    fs.writeFileSync(filePath, csvContent);

    return {
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size
    };
  }

  async generateCustomersCSV(data, filters) {
    const fileName = `customers_report_${Date.now()}.csv`;
    const filePath = path.join(this.reportsDir, fileName);

    const csvData = [
      ['Prénom', 'Nom', 'Email', 'Téléphone', 'Nombre de commandes', 'Total dépensé', 'Date inscription', 'Dernière activité']
    ];

    data.customers.forEach(customer => {
      csvData.push([
        customer.first_name || '',
        customer.last_name || '',
        customer.email || '',
        customer.phone || '',
        customer.order_count || 0,
        parseFloat(customer.total_spent || 0).toFixed(2),
        new Date(customer.created_at).toLocaleDateString('fr-FR'),
        new Date(customer.updated_at).toLocaleDateString('fr-FR')
      ]);
    });

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    fs.writeFileSync(filePath, csvContent);

    return {
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size
    };
  }

  async generateOrdersCSV(data, filters) {
    const fileName = `orders_report_${Date.now()}.csv`;
    const filePath = path.join(this.reportsDir, fileName);

    const csvData = [
      ['N° Commande', 'Prénom client', 'Nom client', 'Email', 'Boutique', 'Montant', 'Statut', 'Méthode paiement', 'Statut paiement', 'Date création', 'Dernière MAJ']
    ];

    data.orders.forEach(order => {
      csvData.push([
        order.order_number || '',
        order.first_name || '',
        order.last_name || '',
        order.email || '',
        order.store_name || '',
        parseFloat(order.total_amount).toFixed(2),
        order.status || '',
        order.payment_method || '',
        order.payment_status || '',
        new Date(order.created_at).toLocaleDateString('fr-FR'),
        new Date(order.updated_at).toLocaleDateString('fr-FR')
      ]);
    });

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    fs.writeFileSync(filePath, csvContent);

    return {
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size
    };
  }

  // =================== GESTION DES FICHIERS ===================

  async saveReportExport(reportData, userId, scheduledReportId = null) {
    return await db('report_exports').insert({
      file_name: reportData.fileName,
      file_path: reportData.filePath,
      file_type: path.extname(reportData.fileName).substring(1),
      file_size: reportData.fileSize,
      report_type: reportData.reportType || 'manual',
      filters_used: reportData.filters ? JSON.stringify(reportData.filters) : null,
      generated_by: userId,
      scheduled_report_id: scheduledReportId,
      status: 'completed',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      metadata: reportData.metadata ? JSON.stringify(reportData.metadata) : null
    }).returning('*');
  }

  async cleanExpiredReports() {
    // Récupérer les fichiers expirés
    const expiredReports = await db('report_exports')
      .where('expires_at', '<', new Date())
      .where('status', 'completed');

    for (let report of expiredReports) {
      try {
        // Supprimer le fichier physique
        if (fs.existsSync(report.file_path)) {
          fs.unlinkSync(report.file_path);
        }

        // Marquer comme expiré dans la base
        await db('report_exports')
          .where('id', report.id)
          .update({ status: 'expired' });

        console.log(`Rapport expiré supprimé: ${report.file_name}`);
      } catch (error) {
        console.error(`Erreur lors de la suppression du rapport ${report.file_name}:`, error);
      }
    }

    return expiredReports.length;
  }

  async getReportHistory(userId, limit = 50) {
    return await db('report_exports')
      .where('generated_by', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .select('*');
  }

  async getReportFile(reportId, userId) {
    return await db('report_exports')
      .where('id', reportId)
      .where('generated_by', userId)
      .where('status', 'completed')
      .first();
  }
}

module.exports = new ReportService();