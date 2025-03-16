var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var PrismaClient = require('@prisma/client').PrismaClient;
var bcrypt = require('bcryptjs');
var prisma = new PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminCount, hashedPassword, newAdminCount, hashedPassword, stageCount, stages, _i, stages_1, stage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.user.count()];
                case 1:
                    adminCount = _a.sent();
                    if (!(adminCount === 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, bcrypt.hash('admin123', 10)];
                case 2:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                name: 'Administrador',
                                email: 'admin@empresa.com',
                                password: hashedPassword,
                                role: 'ADMIN',
                            },
                        })];
                case 3:
                    _a.sent();
                    console.log('Usuário administrador criado com sucesso!');
                    console.log('Email: admin@empresa.com');
                    console.log('Senha: admin123');
                    return [3 /*break*/, 5];
                case 4:
                    console.log('Usuário administrador já existe, pulando criação.');
                    _a.label = 5;
                case 5: return [4 /*yield*/, prisma.admin.count()];
                case 6:
                    newAdminCount = _a.sent();
                    if (!(newAdminCount === 0)) return [3 /*break*/, 9];
                    return [4 /*yield*/, bcrypt.hash('admin123', 10)];
                case 7:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, prisma.admin.create({
                            data: {
                                name: 'Administrador',
                                email: 'admin@empresa.com',
                                password: hashedPassword,
                                company: 'AvaliaRH',
                                position: 'Gerente de RH',
                                phone: '(11) 99999-9999',
                            },
                        })];
                case 8:
                    _a.sent();
                    console.log('Administrador criado no novo modelo com sucesso!');
                    return [3 /*break*/, 10];
                case 9:
                    console.log('Administrador no novo modelo já existe, pulando criação.');
                    _a.label = 10;
                case 10: return [4 /*yield*/, prisma.stage.count()];
                case 11:
                    stageCount = _a.sent();
                    if (!(stageCount === 0)) return [3 /*break*/, 16];
                    const now = new Date();
                    stages = [
                        { id: 'stage-1', title: 'Raciocínio Lógico', description: 'Testes de padrões, sequências e dedução lógica', order: 1, updatedAt: now },
                        { id: 'stage-2', title: 'Matemática Básica e Resolução de Problemas', description: 'Cálculo mental, proporções e análise de dados', order: 2, updatedAt: now },
                        { id: 'stage-3', title: 'Compreensão Verbal', description: 'Interpretação de texto, sinônimos, analogias', order: 3, updatedAt: now },
                        { id: 'stage-4', title: 'Aptidão Espacial', description: 'Questões envolvendo rotação mental e padrões visuais', order: 4, updatedAt: now },
                        { id: 'stage-5', title: 'Raciocínio Abstrato', description: 'Questões que exigem encontrar relações não óbvias', order: 5, updatedAt: now },
                        { id: 'stage-6', title: 'Tomada de Decisão e Solução de Problemas', description: 'Situações hipotéticas e a melhor resposta', order: 6, updatedAt: now },
                    ];
                    _i = 0, stages_1 = stages;
                    _a.label = 12;
                case 12:
                    if (!(_i < stages_1.length)) return [3 /*break*/, 15];
                    stage = stages_1[_i];
                    return [4 /*yield*/, prisma.stage.create({
                            data: stage,
                        })];
                case 13:
                    _a.sent();
                    _a.label = 14;
                case 14:
                    _i++;
                    return [3 /*break*/, 12];
                case 15:
                    console.log('Etapas padrão criadas com sucesso!');
                    return [3 /*break*/, 17];
                case 16:
                    console.log('Etapas já existem, pulando criação.');
                    _a.label = 17;
                case 17: return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
