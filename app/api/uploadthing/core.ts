import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';

const f = createUploadthing();

export const ourFileRouter = {
  companyImage: f({ image: { maxFileSize: '4MB' } })
    .middleware(async () => {
      // You can add auth or limits here
      return { userId: 'anon' };
    })
    .onUploadError(({ error }) => {
      console.error('Upload error', error);
      throw new UploadThingError('Upload failed');
    })
    .onUploadComplete(async ({ file }) => {
      // Return the public URL
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
