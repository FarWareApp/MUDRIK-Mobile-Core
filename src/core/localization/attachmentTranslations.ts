export const attachmentTranslations = {
  ar: {
    attachmentRestoreFailed: 'تعذر استعادة المرفقات.',
    attachmentAddFailed: 'تعذر إضافة المرفق.',
    attachmentPhotosOpenFailed: 'تعذر فتح الصور ومقاطع الفيديو.',
    attachmentCameraFailed: 'تعذر استخدام الكاميرا أو التقاط الصورة.',
    attachmentFilesOpenFailed: 'تعذر فتح الملفات.',
    attachmentRemoveFailed: 'تعذر إزالة المرفق.',
  },
  de: {
    attachmentRestoreFailed: 'Anhänge konnten nicht wiederhergestellt werden.',
    attachmentAddFailed: 'Der Anhang konnte nicht hinzugefügt werden.',
    attachmentPhotosOpenFailed: 'Fotos und Videos konnten nicht geöffnet werden.',
    attachmentCameraFailed: 'Die Kamera konnte nicht verwendet oder die Aufnahme nicht abgeschlossen werden.',
    attachmentFilesOpenFailed: 'Dateien konnten nicht geöffnet werden.',
    attachmentRemoveFailed: 'Der Anhang konnte nicht entfernt werden.',
  },
  en: {
    attachmentRestoreFailed: 'Unable to restore attachments.',
    attachmentAddFailed: 'Unable to add attachment.',
    attachmentPhotosOpenFailed: 'Unable to open photos and videos.',
    attachmentCameraFailed: 'Unable to use the camera or complete the capture.',
    attachmentFilesOpenFailed: 'Unable to open files.',
    attachmentRemoveFailed: 'Unable to remove attachment.',
  },
} as const;

export type AttachmentTranslationKey =
  keyof typeof attachmentTranslations.en;
