import * as Minio from "minio"

// Configuração do cliente MinIO
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
})

const BUCKET_NAME = process.env.MINIO_BUCKET || "sge-atlantida"

// Garantir que o bucket existe
export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET_NAME)
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME)
    console.log(`✅ Bucket "${BUCKET_NAME}" criado`)
  }
}

// Upload de ficheiro
export async function uploadFile(
  objectName: string,
  file: Buffer,
  contentType: string
) {
  await ensureBucket()
  await minioClient.putObject(BUCKET_NAME, objectName, file, file.length, {
    "Content-Type": contentType,
  })
  return objectName
}

// Download de ficheiro
export async function downloadFile(objectName: string) {
  return await minioClient.getObject(BUCKET_NAME, objectName)
}

// Obter URL assinada (expira em 24h)
export async function getSignedUrl(objectName: string, expirySeconds = 86400) {
  return await minioClient.presignedGetObject(
    BUCKET_NAME,
    objectName,
    expirySeconds
  )
}

// Eliminar ficheiro
export async function deleteFile(objectName: string) {
  await minioClient.removeObject(BUCKET_NAME, objectName)
}

// Listar ficheiros num prefixo
export async function listFiles(prefix: string) {
  const objectsStream = minioClient.listObjectsV2(BUCKET_NAME, prefix, true)
  const objects: { name: string; size: number; lastModified: Date }[] = []

  return new Promise<typeof objects>((resolve, reject) => {
    objectsStream.on("data", (obj) => {
      objects.push({
        name: obj.name || "",
        size: obj.size || 0,
        lastModified: obj.lastModified || new Date(),
      })
    })
    objectsStream.on("end", () => resolve(objects))
    objectsStream.on("error", reject)
  })
}

export { minioClient, BUCKET_NAME }