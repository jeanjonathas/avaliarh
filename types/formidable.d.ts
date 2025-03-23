import * as formidable from 'formidable';

declare module 'formidable' {
  interface File extends formidable.File {}
}
