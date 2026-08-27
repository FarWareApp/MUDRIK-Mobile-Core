import {
  PickedAttachment,
} from './Attachment';

export interface AttachmentPicker {
  pickMedia():
    Promise<PickedAttachment[]>;

  takePhoto():
    Promise<PickedAttachment[]>;

  pickDocuments():
    Promise<PickedAttachment[]>;
}
