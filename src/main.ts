import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Security headers (helmet)
  app.use(helmet());

  // 2. Global validation: the @IsString(), @IsInt() ... rules of the DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away properties that are not in the DTO
      transform: true, // Converts types (for example "1" becomes 1)
      forbidNonWhitelisted: true, // Throws an error if extra fields are sent
    }),
  );

  // 3. CORS: which websites may call this API from a browser.
  // Set CORS_ORIGINS to the addresses of your sites, separated by commas.
  // When it is not set, any website is allowed (the old behaviour).
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (corsOrigins.length === 0) {
    console.warn(
      'CORS_ORIGINS is not set: any website can call this API from a browser.',
    );
  }

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    // The admin sends its token in a header, so no cookies are needed.
    credentials: false,
  });

  // 4. Start the server
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
void bootstrap();
