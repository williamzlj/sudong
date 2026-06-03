import { useState, useEffect } from 'react';
import { Trash2, CheckSquare, Square, Image, User, Bot, MessageSquare, X, AlertTriangle, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ImageInfo, getAllImagesByUserId, deleteImage, getStorageInfo } from '../../db/indexedDB';

interface ImageManagerProps {
  userId: string;
  isDarkMode?: boolean;
}

export const ImageManager = ({ userId, isDarkMode = false }: ImageManagerProps) => {
  const { t } = useTranslation();
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ used: 0, imageCount: 0 });

  useEffect(() => {
    loadImages();
  }, [userId]);

  const loadImages = async () => {
    setIsLoading(true);
    try {
      const allImages = await getAllImagesByUserId(userId);
      console.log('Loaded images:', allImages.length, allImages.map(img => ({id: img.id, type: img.type, hasData: !!img.data})));
      setImages(allImages);
      const info = await getStorageInfo(userId);
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
    setIsLoading(false);
  };

  const toggleSelect = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const selectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedImages.size === 0) return;
    
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      console.log('Starting deletion of', selectedImages.size, 'images');
      for (const imageId of selectedImages) {
        const image = images.find(img => img.id === imageId);
        if (image) {
          console.log('Deleting image:', imageId, 'type:', image.type);
          await deleteImage(image.id, image.type, userId);
          console.log('Image deleted:', imageId);
        } else {
          console.warn('Image not found in list:', imageId);
        }
      }
      setSelectedImages(new Set());
      setShowDeleteConfirm(false);
      console.log('Reloading images...');
      await loadImages();
      console.log('Images reloaded');
    } catch (error) {
      console.error('Failed to delete images:', error);
    }
  };

  const handleSaveSelected = async () => {
    try {
      console.log('Starting save of', selectedImages.size, 'images');
      for (const imageId of selectedImages) {
        const image = images.find(img => img.id === imageId);
        if (image && image.data) {
          console.log('Saving image:', imageId, 'type:', image.type);
          const link = document.createElement('a');
          link.href = image.data;
          const timestamp = image.timestamp ? new Date(image.timestamp).getTime() : Date.now();
          link.download = `image_${timestamp}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log('Image saved:', imageId);
        } else {
          console.warn('Image not found or has no data:', imageId);
        }
      }
    } catch (error) {
      console.error('Failed to save images:', error);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getImageTypeIcon = (type: string) => {
    switch (type) {
      case 'user_avatar': return <User className="w-4 h-4" />;
      case 'bot_avatar': return <Bot className="w-4 h-4" />;
      case 'message_image': return <MessageSquare className="w-4 h-4" />;
      default: return <Image className="w-4 h-4" />;
    }
  };

  const getImageTypeName = (type: string) => {
    switch (type) {
      case 'user_avatar': return '用户头像';
      case 'bot_avatar': return '机器人头像';
      case 'message_image': return '聊天图片';
      default: return '图片';
    }
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {t('storageUsage')}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('storageInfo', { count: images.length, size: formatSize(storageInfo.used) })}
            </p>
          </div>
          <Image className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
        </div>
      </div>

      {images.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={selectAll}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isDarkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {selectedImages.size === images.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>{selectedImages.size === images.length ? t('deselectAll') : t('selectAll')}</span>
          </button>
          
          {selectedImages.size > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveSelected}
                className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t('saveSelected', { count: selectedImages.size })}</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('deleteSelected', { count: selectedImages.size })}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : images.length === 0 ? (
        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>{t('noUploadedImages')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                selectedImages.has(image.id)
                  ? 'border-red-500 ring-2 ring-red-200'
                  : isDarkMode
                  ? 'border-gray-600 hover:border-gray-500'
                  : 'border-gray-200 hover:border-gray-300'
              } ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
            >
              <button
                onClick={() => toggleSelect(image.id)}
                className={`absolute top-2 left-2 z-10 p-1 rounded-md transition-all ${
                  selectedImages.has(image.id)
                    ? 'bg-red-500 text-white'
                    : isDarkMode
                    ? 'bg-gray-800 bg-opacity-70 text-gray-300 opacity-0 group-hover:opacity-100'
                    : 'bg-white bg-opacity-70 text-gray-600 opacity-0 group-hover:opacity-100'
                }`}
              >
                {selectedImages.has(image.id) ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
              
              <div className="aspect-square p-2">
                <img
                  src={image.data}
                  alt={getImageTypeName(image.type)}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              
              <div className={`p-2 border-t ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center space-x-1 text-xs">
                  {getImageTypeIcon(image.type)}
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                    {getImageTypeName(image.type)}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatSize(image.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-sm w-full shadow-xl`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {t('deleteImageTitle')}
              </h3>
            </div>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {t('deleteSelectedImagesConfirm', { count: selectedImages.size })}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};