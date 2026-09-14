export const projectTranslations = {
  ar: {
    projectNameRequired:
      'يجب إدخال اسم للمشروع.',
    projectCreateFailed:
      'تعذر إنشاء المشروع.',
    projectArchiveUpdateFailed:
      'تعذر تحديث حالة أرشفة المشروع.',
    projectDeleteFailed:
      'تعذر حذف المشروع.',
    noProjectSearchResults:
      'لا توجد مشاريع تطابق البحث.',
    projectSaveDetailsFailed:
      'تعذر حفظ تفاصيل المشروع.',
    projectAddFileFailed:
      'تعذر إضافة الملف إلى المشروع.',
    projectOpenMediaFailed:
      'تعذر فتح الصور والفيديوهات.',
    projectOpenFilesFailed:
      'تعذر فتح الملفات.',
    projectCameraFailed:
      'تعذر استخدام الكاميرا أو التقاط الصورة.',
    projectRemoveFileFailed:
      'تعذر إزالة الملف من المشروع.',
    projectConversationUpdateFailed:
      'تعذر تحديث ربط المحادثة بالمشروع.',
    projectArchivedConversationLabel:
      'مؤرشفة',
  },
  de: {
    projectNameRequired:
      'Der Projektname darf nicht leer sein.',
    projectCreateFailed:
      'Das Projekt konnte nicht erstellt werden.',
    projectArchiveUpdateFailed:
      'Der Archivstatus des Projekts konnte nicht aktualisiert werden.',
    projectDeleteFailed:
      'Das Projekt konnte nicht gelöscht werden.',
    noProjectSearchResults:
      'Keine Projekte entsprechen der Suche.',
    projectSaveDetailsFailed:
      'Die Projektdetails konnten nicht gespeichert werden.',
    projectAddFileFailed:
      'Die Datei konnte dem Projekt nicht hinzugefügt werden.',
    projectOpenMediaFailed:
      'Fotos und Videos konnten nicht geöffnet werden.',
    projectOpenFilesFailed:
      'Dateien konnten nicht geöffnet werden.',
    projectCameraFailed:
      'Die Kamera konnte nicht verwendet oder das Foto nicht aufgenommen werden.',
    projectRemoveFileFailed:
      'Die Projektdatei konnte nicht entfernt werden.',
    projectConversationUpdateFailed:
      'Die Projektzuordnung der Unterhaltung konnte nicht aktualisiert werden.',
    projectArchivedConversationLabel:
      'Archiviert',
  },
  en: {
    projectNameRequired:
      'Project name cannot be empty.',
    projectCreateFailed:
      'Unable to create project.',
    projectArchiveUpdateFailed:
      'Unable to update the project archive state.',
    projectDeleteFailed:
      'Unable to delete project.',
    noProjectSearchResults:
      'No projects match the search.',
    projectSaveDetailsFailed:
      'Unable to save project details.',
    projectAddFileFailed:
      'Unable to add the file to the project.',
    projectOpenMediaFailed:
      'Unable to open photos and videos.',
    projectOpenFilesFailed:
      'Unable to open files.',
    projectCameraFailed:
      'Unable to use the camera or capture the photo.',
    projectRemoveFileFailed:
      'Unable to remove the project file.',
    projectConversationUpdateFailed:
      'Unable to update the project conversation link.',
    projectArchivedConversationLabel:
      'Archived',
  },
} as const;

export type ProjectTranslationKey =
  keyof typeof projectTranslations.en;
