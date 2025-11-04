const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Configuration du stockage avec gestion des catégories
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const category = req.body.category || 'general';
    const uploadPath = path.join(__dirname, '../../uploads/temp', category);
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Générer un nom unique pour éviter les conflits
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + sanitizedName);
  }
});

// Filtre avancé pour les types de fichiers avec validation d'images
const fileFilter = async (req, file, cb) => {
  try {
    // Types de fichiers autorisés par catégorie
    const allowedTypes = {
      images: [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff'
      ],
      documents: [
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    };

    const allAllowedTypes = [...allowedTypes.images, ...allowedTypes.documents];
    
    if (!allAllowedTypes.includes(file.mimetype)) {
      return cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`), false);
    }

    // Validation spéciale pour les images
    if (allowedTypes.images.includes(file.mimetype)) {
      // On accepte le fichier et la validation détaillée se fera plus tard
      // car multer ne permet pas de validation asynchrone complète ici
      return cb(null, true);
    }

    cb(null, true);

  } catch (error) {
    cb(new Error('Erreur lors de la validation du fichier'), false);
  }
};

// Validation d'image approfondie (à utiliser après multer)
const validateImageFile = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    
    // Validation des dimensions
    const maxWidth = parseInt(process.env.MAX_IMAGE_WIDTH) || 4000;
    const maxHeight = parseInt(process.env.MAX_IMAGE_HEIGHT) || 4000;
    const minWidth = parseInt(process.env.MIN_IMAGE_WIDTH) || 50;
    const minHeight = parseInt(process.env.MIN_IMAGE_HEIGHT) || 50;

    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      throw new Error(`Image trop grande. Maximum: ${maxWidth}x${maxHeight}px`);
    }

    if (metadata.width < minWidth || metadata.height < minHeight) {
      throw new Error(`Image trop petite. Minimum: ${minWidth}x${minHeight}px`);
    }

    // Validation du format
    const supportedFormats = ['jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'];
    if (!supportedFormats.includes(metadata.format)) {
      throw new Error(`Format d'image non supporté: ${metadata.format}`);
    }

    // Validation de l'intégrité
    if (!metadata.width || !metadata.height || !metadata.channels) {
      throw new Error('Fichier image corrompu ou invalide');
    }

    return {
      valid: true,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        space: metadata.space
      }
    };

  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
};

// Configuration multer avec limites étendues
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max pour les images
    files: 10, // Maximum 10 fichiers en upload multiple
    fieldNameSize: 100,
    fieldSize: 1024 * 1024, // 1MB pour les champs texte
    fields: 20
  }
});

// Middleware de validation post-upload pour les images
const validateUploadedImages = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    for (const file of files) {
      // Valider seulement les fichiers images
      if (file.mimetype.startsWith('image/')) {
        const validation = await validateImageFile(file.path);
        
        if (!validation.valid) {
          // Supprimer le fichier invalide
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkError) {
            console.warn('Impossible de supprimer le fichier invalide:', unlinkError);
          }
          
          return res.status(400).json({
            success: false,
            message: `Fichier ${file.originalname}: ${validation.error}`
          });
        }
        
        // Ajouter les métadonnées au fichier
        file.imageMetadata = validation.metadata;
      }
    }
    
    next();
    
  } catch (error) {
    console.error('Erreur validation images uploadées:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation des images'
    });
  }
};

// Middleware de nettoyage des fichiers temporaires en cas d'erreur
const cleanupTempFiles = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Si erreur et qu'il y a des fichiers, les supprimer
    if (res.statusCode >= 400) {
      const files = req.files || (req.file ? [req.file] : []);
      
      files.forEach(file => {
        if (file.path) {
          fs.unlink(file.path, (err) => {
            if (err) {
              console.warn('Impossible de supprimer le fichier temporaire:', err);
            }
          });
        }
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Configuration spécialisée pour les images
const imageUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const imageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ];
    
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers images sont autorisés'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10
  }
});

// Configuration spécialisée pour les documents
const documentUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const documentTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (documentTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de document non autorisé'), false);
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB max pour les documents
  }
});

module.exports = {
  upload,
  imageUpload,
  documentUpload,
  validateImageFile,
  validateUploadedImages,
  cleanupTempFiles
};
