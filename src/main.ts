import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable Global Validation
  // This ensures that @IsString(), @IsInt(), etc. in your DTOs actually work
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away properties that are not in your DTO
      transform: true, // Automatically converts types (e.g., "1" becomes 1)
      forbidNonWhitelisted: true, // Throws an error if extra fields are sent
    }),
  );

  // 2. Enable CORS
  // This allows your Frontend (running on a different port) to talk to this Backend
  app.enableCors({
    origin: true, // Allows all origins (Change this to your specific frontend URL in production)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 3. Start the Server
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();