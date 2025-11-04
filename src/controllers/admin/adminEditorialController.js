const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get all blog posts
 * @route   GET /api/admin/editorial/blog
 * @access  Private/Admin
 */
exports.getBlogPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db('blog_posts as bp')
      .leftJoin('users as u', 'bp.author_id', 'u.id')
      .select(
        'bp.*',
        'u.first_name as author_first_name',
        'u.last_name as author_last_name'
      );

    if (status) query = query.where('bp.status', status);

    const [{ count: total }] = await query.clone().count('bp.id as count');
    const posts = await query
      .orderBy('bp.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    successResponse(res, {
      posts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Blog posts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create blog post
 * @route   POST /api/admin/editorial/blog
 * @access  Private/Admin
 */
exports.createBlogPost = async (req, res, next) => {
  try {
    const { title, slug, content, excerpt, featured_image, category, tags, status } = req.body;

    const [postId] = await db('blog_posts').insert({
      title,
      slug,
      content,
      excerpt,
      featured_image,
      category,
      tags: JSON.stringify(tags || []),
      status: status || 'draft',
      author_id: req.user.id,
      created_at: db.fn.now()
    });

    const post = await db('blog_posts').where('id', postId).first();
    successResponse(res, { post }, 'Blog post created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update blog post
 * @route   PUT /api/admin/editorial/blog/:id
 * @access  Private/Admin
 */
exports.updateBlogPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await db('blog_posts').where('id', id).first();
    if (!post) throw new AppError('Blog post not found', 404);

    if (req.body.tags) req.body.tags = JSON.stringify(req.body.tags);

    await db('blog_posts')
      .where('id', id)
      .update({ ...req.body, updated_at: db.fn.now() });

    const updated = await db('blog_posts').where('id', id).first();
    successResponse(res, { post: updated }, 'Blog post updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete blog post
 * @route   DELETE /api/admin/editorial/blog/:id
 * @access  Private/Admin
 */
exports.deleteBlogPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await db('blog_posts').where('id', id).first();
    if (!post) throw new AppError('Blog post not found', 404);

    await db('blog_posts').where('id', id).delete();
    successResponse(res, null, 'Blog post deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Publish blog post
 * @route   POST /api/admin/editorial/blog/:id/publish
 * @access  Private/Admin
 */
exports.publishBlogPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    await db('blog_posts')
      .where('id', id)
      .update({
        status: 'published',
        published_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    successResponse(res, null, 'Blog post published successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get featured items (products/vendors)
 * @route   GET /api/admin/editorial/featured
 * @access  Private/Admin
 */
exports.getFeaturedItems = async (req, res, next) => {
  try {
    const { type } = req.query; // 'product' or 'vendor'

    let query = db('featured_items as fi')
      .select('fi.*');

    if (type === 'product') {
      query = query
        .join('products as p', 'fi.item_id', 'p.id')
        .where('fi.item_type', 'product')
        .select('fi.*', 'p.name', 'p.image_url', 'p.price');
    } else if (type === 'vendor') {
      query = query
        .join('vendors as v', 'fi.item_id', 'v.id')
        .where('fi.item_type', 'vendor')
        .select('fi.*', 'v.business_name', 'v.logo_url');
    }

    const items = await query.orderBy('fi.display_order', 'asc');

    successResponse(res, { featured_items: items }, 'Featured items retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add featured item
 * @route   POST /api/admin/editorial/featured
 * @access  Private/Admin
 */
exports.addFeaturedItem = async (req, res, next) => {
  try {
    const { item_type, item_id, display_order } = req.body;

    const [featuredId] = await db('featured_items').insert({
      item_type,
      item_id,
      display_order,
      is_active: true,
      created_at: db.fn.now()
    });

    const item = await db('featured_items').where('id', featuredId).first();
    successResponse(res, { featured_item: item }, 'Featured item added successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove featured item
 * @route   DELETE /api/admin/editorial/featured/:id
 * @access  Private/Admin
 */
exports.removeFeaturedItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    await db('featured_items').where('id', id).delete();
    successResponse(res, null, 'Featured item removed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle featured item
 * @route   PATCH /api/admin/editorial/featured/:id/toggle
 * @access  Private/Admin
 */
exports.toggleFeaturedItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await db('featured_items').where('id', id).first();
    if (!item) throw new AppError('Featured item not found', 404);

    await db('featured_items')
      .where('id', id)
      .update({ is_active: !item.is_active });

    successResponse(res, null, 'Featured item toggled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get banners
 * @route   GET /api/admin/editorial/banners
 * @access  Private/Admin
 */
exports.getBanners = async (req, res, next) => {
  try {
    const banners = await db('banners')
      .orderBy('display_order', 'asc')
      .select('*');

    successResponse(res, { banners }, 'Banners retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create banner
 * @route   POST /api/admin/editorial/banners
 * @access  Private/Admin
 */
exports.createBanner = async (req, res, next) => {
  try {
    const { title, image_url, link_url, placement, display_order, start_date, end_date } = req.body;

    const [bannerId] = await db('banners').insert({
      title,
      image_url,
      link_url,
      placement,
      display_order,
      start_date,
      end_date,
      is_active: true,
      created_at: db.fn.now()
    });

    const banner = await db('banners').where('id', bannerId).first();
    successResponse(res, { banner }, 'Banner created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update banner
 * @route   PUT /api/admin/editorial/banners/:id
 * @access  Private/Admin
 */
exports.updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    await db('banners')
      .where('id', id)
      .update({ ...req.body, updated_at: db.fn.now() });

    const banner = await db('banners').where('id', id).first();
    successResponse(res, { banner }, 'Banner updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete banner
 * @route   DELETE /api/admin/editorial/banners/:id
 * @access  Private/Admin
 */
exports.deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    await db('banners').where('id', id).delete();
    successResponse(res, null, 'Banner deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle banner
 * @route   PATCH /api/admin/editorial/banners/:id/toggle
 * @access  Private/Admin
 */
exports.toggleBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const banner = await db('banners').where('id', id).first();
    if (!banner) throw new AppError('Banner not found', 404);

    await db('banners')
      .where('id', id)
      .update({ is_active: !banner.is_active });

    successResponse(res, null, 'Banner toggled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get newsletters
 * @route   GET /api/admin/editorial/newsletters
 * @access  Private/Admin
 */
exports.getNewsletters = async (req, res, next) => {
  try {
    const newsletters = await db('newsletters')
      .orderBy('created_at', 'desc')
      .select('*');

    successResponse(res, { newsletters }, 'Newsletters retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create newsletter
 * @route   POST /api/admin/editorial/newsletters
 * @access  Private/Admin
 */
exports.createNewsletter = async (req, res, next) => {
  try {
    const { subject, content, recipients_filter } = req.body;

    const [newsletterId] = await db('newsletters').insert({
      subject,
      content,
      recipients_filter: JSON.stringify(recipients_filter || {}),
      status: 'draft',
      created_by: req.user.id,
      created_at: db.fn.now()
    });

    const newsletter = await db('newsletters').where('id', newsletterId).first();
    successResponse(res, { newsletter }, 'Newsletter created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send newsletter
 * @route   POST /api/admin/editorial/newsletters/:id/send
 * @access  Private/Admin
 */
exports.sendNewsletter = async (req, res, next) => {
  try {
    const { id } = req.params;

    await db('newsletters')
      .where('id', id)
      .update({
        status: 'sent',
        sent_at: db.fn.now(),
        sent_by: req.user.id
      });

    // TODO: Trigger email sending service

    successResponse(res, null, 'Newsletter sent successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Schedule newsletter
 * @route   POST /api/admin/editorial/newsletters/:id/schedule
 * @access  Private/Admin
 */
exports.scheduleNewsletter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduled_for } = req.body;

    await db('newsletters')
      .where('id', id)
      .update({
        status: 'scheduled',
        scheduled_for
      });

    successResponse(res, null, 'Newsletter scheduled successfully');
  } catch (error) {
    next(error);
  }
};
