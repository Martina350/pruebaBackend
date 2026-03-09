import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS: acepta varias URLs en FRONTEND_URL separadas por coma
  const frontendUrls = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim()).filter(Boolean)
    : ['http://localhost:5173'];
  
  // En desarrollo, permitir todos los orígenes
  const corsOrigin = process.env.NODE_ENV === 'production' 
    ? (frontendUrls.length > 0 ? frontendUrls : true)
    : true;
  
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
}
bootstrap();
