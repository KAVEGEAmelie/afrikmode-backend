const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get loyalty program
 * @route   GET /api/vendor/loyalty/program
 * @access  Private/Vendor
 */
exports.getLoyaltyProgram = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const program = await db('loyalty_programs')
      .where('vendor_id', vendorId)
      .first();

    if (!program) {
      return successResponse(res, { program: null }, 'No loyalty program found');
    }

    // Get tiers
    const tiers = await db('loyalty_tiers')
      .where('program_id', program.id)
      .orderBy('min_points', 'asc')
      .select('*');

    // Get rewards
    const rewards = await db('loyalty_rewards')
      .where('program_id', program.id)
      .orderBy('points_required', 'asc')
      .select('*');

    successResponse(res, {
      program: {
        ...program,
        tiers,
        rewards
      }
    }, 'Loyalty program retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create loyalty program
 * @route   POST /api/vendor/loyalty/program
 * @access  Private/Vendor
 */
exports.createLoyaltyProgram = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { name, description, points_per_xof, is_active } = req.body;

    // Check if program already exists
    const existing = await db('loyalty_programs')
      .where('vendor_id', vendorId)
      .first();

    if (existing) {
      throw new AppError('Loyalty program already exists', 400);
    }

    const [programId] = await db('loyalty_programs').insert({
      vendor_id: vendorId,
      name,
      description,
      points_per_xof: points_per_xof || 1, // 1 point per 1 XOF spent
      is_active: is_active !== undefined ? is_active : true,
      created_at: db.fn.now()
    });

    const program = await db('loyalty_programs').where('id', programId).first();
    successResponse(res, { program }, 'Loyalty program created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update loyalty program
 * @route   PUT /api/vendor/loyalty/program
 * @access  Private/Vendor
 */
exports.updateLoyaltyProgram = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const program = await db('loyalty_programs')
      .where('vendor_id', vendorId)
      .first();

    if (!program) throw new AppError('Loyalty program not found', 404);

    await db('loyalty_programs')
      .where('vendor_id', vendorId)
      .update({ ...req.body, updated_at: db.fn.now() });

    const updated = await db('loyalty_programs')
      .where('vendor_id', vendorId)
      .first();

    successResponse(res, { program: updated }, 'Loyalty program updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create tier
 * @route   POST /api/vendor/loyalty/tiers
 * @access  Private/Vendor
 */
exports.createTier = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { name, min_points, max_points, benefits, discount_percentage } = req.body;

    const program = await db('loyalty_programs')
      .where('vendor_id', vendorId)
      .first();

    if (!program) throw new AppError('Create a loyalty program first', 404);

    const [tierId] = await db('loyalty_tiers').insert({
      program_id: program.id,
      name,
      min_points,
      max_points,
      benefits: JSON.stringify(benefits),
      discount_percentage,
      created_at: db.fn.now()
    });

    const tier = await db('loyalty_tiers').where('id', tierId).first();
    successResponse(res, { tier: { ...tier, benefits: JSON.parse(tier.benefits) } }, 'Tier created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update tier
 * @route   PUT /api/vendor/loyalty/tiers/:id
 * @access  Private/Vendor
 */
exports.updateTier = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;
    const { benefits, ...otherData } = req.body;

    // Verify tier belongs to vendor's program
    const tier = await db('loyalty_tiers as lt')
      .join('loyalty_programs as lp', 'lt.program_id', 'lp.id')
      .where('lt.id', id)
      .where('lp.vendor_id', vendorId)
      .first('lt.*');

    if (!tier) throw new AppError('Tier not found', 404);

    const updateData = { ...otherData, updated_at: db.fn.now() };
    if (benefits) updateData.benefits = JSON.stringify(benefits);

    await db('loyalty_tiers').where('id', id).update(updateData);

    const updated = await db('loyalty_tiers').where('id', id).first();
    successResponse(res, { tier: { ...updated, benefits: JSON.parse(updated.benefits) } }, 'Tier updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete tier
 * @route   DELETE /api/vendor/loyalty/tiers/:id
 * @access  Private/Vendor
 */
exports.deleteTier = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const tier = await db('loyalty_tiers as lt')
      .join('loyalty_programs as lp', 'lt.program_id', 'lp.id')
      .where('lt.id', id)
      .where('lp.vendor_id', vendorId)
      .first('lt.*');

    if (!tier) throw new AppError('Tier not found', 404);

    await db('loyalty_tiers').where('id', id).delete();
    successResponse(res, null, 'Tier deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create reward
 * @route   POST /api/vendor/loyalty/rewards
 * @access  Private/Vendor
 */
exports.createReward = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { name, description, points_required, reward_type, reward_value, is_active } = req.body;

    const program = await db('loyalty_programs')
      .where('vendor_id', vendorId)
      .first();

    if (!program) throw new AppError('Create a loyalty program first', 404);

    const [rewardId] = await db('loyalty_rewards').insert({
      program_id: program.id,
      name,
      description,
      points_required,
      reward_type, // 'discount', 'free_shipping', 'free_product'
      reward_value,
      is_active: is_active !== undefined ? is_active : true,
      created_at: db.fn.now()
    });

    const reward = await db('loyalty_rewards').where('id', rewardId).first();
    successResponse(res, { reward }, 'Reward created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update reward
 * @route   PUT /api/vendor/loyalty/rewards/:id
 * @access  Private/Vendor
 */
exports.updateReward = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const reward = await db('loyalty_rewards as lr')
      .join('loyalty_programs as lp', 'lr.program_id', 'lp.id')
      .where('lr.id', id)
      .where('lp.vendor_id', vendorId)
      .first('lr.*');

    if (!reward) throw new AppError('Reward not found', 404);

    await db('loyalty_rewards')
      .where('id', id)
      .update({ ...req.body, updated_at: db.fn.now() });

    const updated = await db('loyalty_rewards').where('id', id).first();
    successResponse(res, { reward: updated }, 'Reward updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete reward
 * @route   DELETE /api/vendor/loyalty/rewards/:id
 * @access  Private/Vendor
 */
exports.deleteReward = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const reward = await db('loyalty_rewards as lr')
      .join('loyalty_programs as lp', 'lr.program_id', 'lp.id')
      .where('lr.id', id)
      .where('lp.vendor_id', vendorId)
      .first('lr.*');

    if (!reward) throw new AppError('Reward not found', 404);

    await db('loyalty_rewards').where('id', id).delete();
    successResponse(res, null, 'Reward deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get member statistics
 * @route   GET /api/vendor/loyalty/stats
 * @access  Private/Vendor
 */
exports.getMemberStats = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const program = await db('loyalty_programs')
      .where('vendor_id', vendorId)
      .first();

    if (!program) {
      return successResponse(res, { stats: null }, 'No loyalty program found');
    }

    // Total members
    const [{ total_members }] = await db('loyalty_memberships')
      .where('program_id', program.id)
      .count('* as total_members');

    // Active members (made purchase in last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [{ active_members }] = await db('loyalty_memberships as lm')
      .join('orders as o', 'lm.user_id', 'o.customer_id')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('lm.program_id', program.id)
      .where('p.vendor_id', vendorId)
      .where('o.created_at', '>=', ninetyDaysAgo)
      .countDistinct('lm.user_id as active_members');

    // Members by tier
    const membersByTier = await db('loyalty_memberships as lm')
      .join('loyalty_tiers as lt', 'lm.current_tier_id', 'lt.id')
      .where('lm.program_id', program.id)
      .select('lt.name as tier_name')
      .count('* as count')
      .groupBy('lt.id');

    // Total points distributed
    const [{ total_points }] = await db('loyalty_memberships')
      .where('program_id', program.id)
      .sum('points_balance as total_points');

    // Rewards redeemed
    const [{ rewards_redeemed }] = await db('loyalty_redemptions')
      .where('program_id', program.id)
      .count('* as rewards_redeemed');

    successResponse(res, {
      total_members: parseInt(total_members) || 0,
      active_members: parseInt(active_members) || 0,
      members_by_tier: membersByTier,
      total_points: parseInt(total_points) || 0,
      rewards_redeemed: parseInt(rewards_redeemed) || 0
    }, 'Member statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};
