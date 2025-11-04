const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');
const nodemailer = require('nodemailer');

/**
 * @desc    Get email campaigns
 * @route   GET /api/vendor/email-marketing/campaigns
 * @access  Private/Vendor
 */
exports.getCampaigns = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db('email_campaigns')
      .where('vendor_id', vendorId);

    if (status) query = query.where('status', status);

    const [{ count: total }] = await query.clone().count('* as count');
    const campaigns = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');

    successResponse(res, {
      campaigns,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Email campaigns retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create email campaign
 * @route   POST /api/vendor/email-marketing/campaigns
 * @access  Private/Vendor
 */
exports.createCampaign = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { name, subject, content, template_id, target_audience, scheduled_at } = req.body;

    const [campaignId] = await db('email_campaigns').insert({
      vendor_id: vendorId,
      name,
      subject,
      content,
      template_id,
      target_audience: JSON.stringify(target_audience),
      scheduled_at,
      status: scheduled_at ? 'scheduled' : 'draft',
      created_at: db.fn.now()
    });

    const campaign = await db('email_campaigns').where('id', campaignId).first();
    successResponse(res, { campaign }, 'Email campaign created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update email campaign
 * @route   PUT /api/vendor/email-marketing/campaigns/:id
 * @access  Private/Vendor
 */
exports.updateCampaign = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const campaign = await db('email_campaigns')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!campaign) throw new AppError('Campaign not found', 404);

    if (campaign.status === 'sent') {
      throw new AppError('Cannot update a campaign that has already been sent', 400);
    }

    const { target_audience, ...otherData } = req.body;
    const updateData = { ...otherData, updated_at: db.fn.now() };
    if (target_audience) updateData.target_audience = JSON.stringify(target_audience);

    await db('email_campaigns').where('id', id).update(updateData);

    const updated = await db('email_campaigns').where('id', id).first();
    successResponse(res, { campaign: updated }, 'Campaign updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete email campaign
 * @route   DELETE /api/vendor/email-marketing/campaigns/:id
 * @access  Private/Vendor
 */
exports.deleteCampaign = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const campaign = await db('email_campaigns')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!campaign) throw new AppError('Campaign not found', 404);

    await db('email_campaigns').where('id', id).delete();
    successResponse(res, null, 'Campaign deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send email campaign
 * @route   POST /api/vendor/email-marketing/campaigns/:id/send
 * @access  Private/Vendor
 */
exports.sendCampaign = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const campaign = await db('email_campaigns')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!campaign) throw new AppError('Campaign not found', 404);

    if (campaign.status === 'sent') {
      throw new AppError('Campaign has already been sent', 400);
    }

    // Get subscribers based on target audience
    const targetAudience = JSON.parse(campaign.target_audience);
    let subscribers = [];

    if (targetAudience.type === 'all_customers') {
      subscribers = await db('orders as o')
        .join('order_items as oi', 'o.id', 'oi.order_id')
        .join('products as p', 'oi.product_id', 'p.id')
        .join('users as u', 'o.customer_id', 'u.id')
        .where('p.vendor_id', vendorId)
        .where('u.email_opt_in', true)
        .distinct('u.email', 'u.first_name', 'u.last_name')
        .select('u.email', 'u.first_name', 'u.last_name');
    } else if (targetAudience.type === 'segment') {
      subscribers = await db('email_subscribers')
        .where('vendor_id', vendorId)
        .where('segment', targetAudience.segment)
        .where('is_subscribed', true)
        .select('email', 'first_name', 'last_name');
    }

    // Update campaign status
    await db('email_campaigns')
      .where('id', id)
      .update({
        status: 'sending',
        sent_at: db.fn.now(),
        recipients_count: subscribers.length
      });

    // TODO: Send emails in background queue
    // For now, mark as sent
    await db('email_campaigns')
      .where('id', id)
      .update({ status: 'sent' });

    successResponse(res, { recipients_count: subscribers.length }, 'Campaign sent successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get email templates
 * @route   GET /api/vendor/email-marketing/templates
 * @access  Private/Vendor
 */
exports.getTemplates = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const templates = await db('email_templates')
      .where(function() {
        this.where('vendor_id', vendorId).orWhereNull('vendor_id');
      })
      .orderBy('created_at', 'desc')
      .select('*');

    successResponse(res, { templates }, 'Email templates retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create email template
 * @route   POST /api/vendor/email-marketing/templates
 * @access  Private/Vendor
 */
exports.createTemplate = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { name, subject, html_content, thumbnail } = req.body;

    const [templateId] = await db('email_templates').insert({
      vendor_id: vendorId,
      name,
      subject,
      html_content,
      thumbnail,
      created_at: db.fn.now()
    });

    const template = await db('email_templates').where('id', templateId).first();
    successResponse(res, { template }, 'Email template created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subscribers
 * @route   GET /api/vendor/email-marketing/subscribers
 * @access  Private/Vendor
 */
exports.getSubscribers = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 50, segment } = req.query;
    const offset = (page - 1) * limit;

    let query = db('email_subscribers')
      .where('vendor_id', vendorId);

    if (segment) query = query.where('segment', segment);

    const [{ count: total }] = await query.clone().count('* as count');
    const subscribers = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');

    successResponse(res, {
      subscribers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Subscribers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get email marketing stats
 * @route   GET /api/vendor/email-marketing/stats
 * @access  Private/Vendor
 */
exports.getEmailMarketingStats = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const [{ total_campaigns }] = await db('email_campaigns')
      .where('vendor_id', vendorId)
      .count('* as total_campaigns');

    const [{ sent_campaigns }] = await db('email_campaigns')
      .where('vendor_id', vendorId)
      .where('status', 'sent')
      .count('* as sent_campaigns');

    const [{ total_subscribers }] = await db('email_subscribers')
      .where('vendor_id', vendorId)
      .where('is_subscribed', true)
      .count('* as total_subscribers');

    const [{ avg_open_rate }] = await db('email_campaigns')
      .where('vendor_id', vendorId)
      .where('status', 'sent')
      .avg('open_rate as avg_open_rate');

    const [{ avg_click_rate }] = await db('email_campaigns')
      .where('vendor_id', vendorId)
      .where('status', 'sent')
      .avg('click_rate as avg_click_rate');

    successResponse(res, {
      total_campaigns: parseInt(total_campaigns) || 0,
      sent_campaigns: parseInt(sent_campaigns) || 0,
      total_subscribers: parseInt(total_subscribers) || 0,
      avg_open_rate: parseFloat(avg_open_rate) || 0,
      avg_click_rate: parseFloat(avg_click_rate) || 0
    }, 'Email marketing stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};
