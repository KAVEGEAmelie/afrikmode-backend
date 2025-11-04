/**
 * VENDOR DASHBOARD CONTROLLER
 * Handles all dashboard-related operations for vendors
 */

const db = require('../config/database');

/**
 * Get dashboard overview
 */
const getDashboardOverview = async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Get basic dashboard data
    const dashboardData = {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      lowStockProducts: 0,
      recentActivity: [],
      topProducts: [],
      salesChart: [],
      ordersChart: []
    };

    // First, get the vendor's store(s)
    const stores = await db('stores')
      .where('owner_id', vendorId)
      .select('id');

    const storeIds = stores.map(s => s.id);

    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: dashboardData
      });
    }

    // Get product count
    const productCount = await db('products')
      .whereIn('store_id', storeIds)
      .count('id as count')
      .first();
    dashboardData.totalProducts = parseInt(productCount.count) || 0;

    // Get order count (orders that contain products from this vendor's stores)
    const orderCount = await db('orders as o')
      .innerJoin('order_items as oi', 'o.id', 'oi.order_id')
      .innerJoin('products as p', 'oi.product_id', 'p.id')
      .whereIn('p.store_id', storeIds)
      .countDistinct('o.id as count')
      .first();
    dashboardData.totalOrders = parseInt(orderCount.count) || 0;

    // Get revenue (sum from order_items for vendor's products)
    const revenue = await db('orders as o')
      .innerJoin('order_items as oi', 'o.id', 'oi.order_id')
      .innerJoin('products as p', 'oi.product_id', 'p.id')
      .whereIn('p.store_id', storeIds)
      .where('o.status', 'delivered')
      .sum('oi.total_price as total')
      .first();
    dashboardData.totalRevenue = parseFloat(revenue.total) || 0;

    // Get pending orders
    const pendingOrders = await db('orders as o')
      .innerJoin('order_items as oi', 'o.id', 'oi.order_id')
      .innerJoin('products as p', 'oi.product_id', 'p.id')
      .whereIn('p.store_id', storeIds)
      .whereIn('o.status', ['pending', 'confirmed', 'processing'])
      .countDistinct('o.id as count')
      .first();
    dashboardData.pendingOrders = parseInt(pendingOrders.count) || 0;

    // Get low stock products
    const lowStock = await db('products')
      .whereIn('store_id', storeIds)
      .where('stock_quantity', '<=', 10)
      .count('id as count')
      .first();
    dashboardData.lowStockProducts = parseInt(lowStock.count) || 0;

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du tableau de bord',
      error: error.message
    });
  }
};

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const stats = {
      sales: {
        total: 0,
        growth: 0,
        chart: []
      },
      orders: {
        total: 0,
        growth: 0,
        chart: []
      },
      customers: {
        total: 0,
        growth: 0,
        chart: []
      },
      revenue: {
        total: 0,
        growth: 0,
        chart: []
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
};

/**
 * Get KPIs
 */
const getKPIs = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const kpis = {
      conversionRate: 0,
      averageOrderValue: 0,
      customerRetention: 0,
      inventoryTurnover: 0
    };

    res.json({
      success: true,
      data: kpis
    });
  } catch (error) {
    console.error('Error getting KPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des KPI',
      error: error.message
    });
  }
};

/**
 * Get recent activity
 */
const getRecentActivity = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { limit = 10 } = req.query;

    const activities = [];

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'activité récente',
      error: error.message
    });
  }
};

/**
 * Get activity by type
 */
const getActivityByType = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { type } = req.params;
    const { limit = 10 } = req.query;

    const activities = [];

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error getting activity by type:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'activité',
      error: error.message
    });
  }
};

/**
 * Get performance metrics
 */
const getPerformanceMetrics = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const metrics = {
      salesPerformance: 0,
      orderPerformance: 0,
      customerSatisfaction: 0,
      inventoryEfficiency: 0
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des métriques de performance',
      error: error.message
    });
  }
};

/**
 * Get performance trends
 */
const getPerformanceTrends = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { period = '30d' } = req.query;

    const trends = {
      sales: [],
      orders: [],
      revenue: [],
      customers: []
    };

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error getting performance trends:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tendances',
      error: error.message
    });
  }
};

/**
 * Get quick actions
 */
const getQuickActions = async (req, res) => {
  try {
    const quickActions = [
      {
        id: 'add-product',
        title: 'Ajouter un produit',
        description: 'Créer un nouveau produit',
        icon: 'add',
        action: 'navigate',
        url: '/vendor/products/new'
      },
      {
        id: 'view-orders',
        title: 'Voir les commandes',
        description: 'Consulter les commandes récentes',
        icon: 'shopping_cart',
        action: 'navigate',
        url: '/vendor/orders'
      },
      {
        id: 'manage-inventory',
        title: 'Gérer le stock',
        description: 'Mettre à jour les quantités',
        icon: 'inventory',
        action: 'navigate',
        url: '/vendor/inventory'
      }
    ];

    res.json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    console.error('Error getting quick actions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des actions rapides',
      error: error.message
    });
  }
};

/**
 * Get notifications
 */
const getNotifications = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { limit = 20, unread_only = false } = req.query;

    const notifications = [];

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications',
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;

    res.json({
      success: true,
      message: 'Notification marquée comme lue'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la notification',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const vendorId = req.user.id;

    res.json({
      success: true,
      message: 'Toutes les notifications marquées comme lues'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des notifications',
      error: error.message
    });
  }
};

/**
 * Get dashboard settings
 */
const getDashboardSettings = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const settings = {
      widgets: [],
      layout: 'default',
      refreshInterval: 30000
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting dashboard settings:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paramètres',
      error: error.message
    });
  }
};

/**
 * Update dashboard settings
 */
const updateDashboardSettings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { widgets, layout, refreshInterval } = req.body;

    res.json({
      success: true,
      message: 'Paramètres mis à jour avec succès'
    });
  } catch (error) {
    console.error('Error updating dashboard settings:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des paramètres',
      error: error.message
    });
  }
};

/**
 * Get widgets
 */
const getWidgets = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const widgets = [
      {
        id: 'sales-overview',
        title: 'Vue d\'ensemble des ventes',
        type: 'chart',
        position: { x: 0, y: 0, w: 6, h: 4 }
      },
      {
        id: 'recent-orders',
        title: 'Commandes récentes',
        type: 'table',
        position: { x: 6, y: 0, w: 6, h: 4 }
      }
    ];

    res.json({
      success: true,
      data: widgets
    });
  } catch (error) {
    console.error('Error getting widgets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des widgets',
      error: error.message
    });
  }
};

/**
 * Update widgets
 */
const updateWidgets = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { widgets } = req.body;

    res.json({
      success: true,
      message: 'Widgets mis à jour avec succès'
    });
  } catch (error) {
    console.error('Error updating widgets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des widgets',
      error: error.message
    });
  }
};

/**
 * Export dashboard data
 */
const exportDashboardData = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { format = 'json', period = '30d' } = req.query;

    const data = {
      overview: {},
      stats: {},
      activities: []
    };

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error exporting dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export des données',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardOverview,
  getDashboardStats,
  getKPIs,
  getRecentActivity,
  getActivityByType,
  getPerformanceMetrics,
  getPerformanceTrends,
  getQuickActions,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getDashboardSettings,
  updateDashboardSettings,
  getWidgets,
  updateWidgets,
  exportDashboardData
};