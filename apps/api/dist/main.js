"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get((config_1.ConfigService));
    app.disable('x-powered-by');
    app.setGlobalPrefix('api/v1');
    app.enableShutdownHooks();
    if (config.get('NODE_ENV', { infer: true }) === 'development') {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('PS Dashboard API')
            .setDescription('Workforce dashboard endpoints')
            .setVersion('1.0')
            .build();
        swagger_1.SwaggerModule.setup('docs', app, () => swagger_1.SwaggerModule.createDocument(app, swaggerConfig));
    }
    const port = config.get('PORT', { infer: true });
    await app.listen(port, '127.0.0.1');
}
void bootstrap();
//# sourceMappingURL=main.js.map