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
        var superAdminCount, hashedSuperAdminPassword, drAnimalCompany, avaliaRHCompany, drAnimalAdminPassword, stageCount, stages, _i, stages_1, stage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.user.count({
                        where: {
                            role: 'SUPER_ADMIN'
                        }
                    })];
                case 1:
                    superAdminCount = _a.sent();
                    if (!(superAdminCount === 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, bcrypt.hash('Je@nfree16', 10)];
                case 2:
                    hashedSuperAdminPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                name: 'Jean Jonathas',
                                email: 'jeanjonathasfb@gmail.com',
                                password: hashedSuperAdminPassword,
                                role: 'SUPER_ADMIN',
                            },
                        })];
                case 3:
                    _a.sent();
                    console.log('Usuário Super Admin criado com sucesso!');
                    console.log('Email: jeanjonathasfb@gmail.com');
                    console.log('Senha: Je@nfree16');
                    return [3 /*break*/, 4];
                case 4:
                    console.log('Verificando ou criando empresas...');
                    return [4 /*yield*/, prisma.company.upsert({
                            where: { cnpj: '12.345.678/0001-91' },
                            update: {},
                            create: {
                                name: 'Dr. Animal',
                                plan: 'Enterprise',
                                cnpj: '12.345.678/0001-91',
                                maxUsers: 50,
                                maxCandidates: 1000,
                            },
                        })];
                case 5:
                    drAnimalCompany = _a.sent();
                    return [4 /*yield*/, prisma.company.upsert({
                            where: { cnpj: '12.345.678/0001-90' },
                            update: {},
                            create: {
                                name: 'AvaliaRH',
                                plan: 'Enterprise',
                                cnpj: '12.345.678/0001-90',
                                maxUsers: 50,
                                maxCandidates: 1000,
                            },
                        })];
                case 6:
                    avaliaRHCompany = _a.sent();
                    console.log('Empresas criadas/atualizadas com sucesso!');
                    return [4 /*yield*/, bcrypt.hash('admin123', 10)];
                case 7:
                    drAnimalAdminPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'jean@dranimal.com.br' },
                            update: {
                                companyId: drAnimalCompany.id,
                                role: 'COMPANY_ADMIN'
                            },
                            create: {
                                name: 'Jean Administrador',
                                email: 'jean@dranimal.com.br',
                                password: drAnimalAdminPassword,
                                role: 'COMPANY_ADMIN',
                                companyId: drAnimalCompany.id,
                            },
                        })];
                case 8:
                    _a.sent();
                    console.log('Usuário Admin Dr. Animal criado com sucesso!');
                    console.log('Email: jean@dranimal.com.br');
                    console.log('Senha: admin123');
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'admin@empresa.com' },
                            update: {
                                companyId: avaliaRHCompany.id,
                                role: 'COMPANY_ADMIN'
                            },
                            create: {
                                name: 'Administrador',
                                email: 'admin@empresa.com',
                                password: drAnimalAdminPassword,
                                role: 'COMPANY_ADMIN',
                                companyId: avaliaRHCompany.id,
                            },
                        })];
                case 9:
                    _a.sent();
                    console.log('Usuário Admin AvaliaRH criado com sucesso!');
                    return [4 /*yield*/, prisma.stage.count()];
                case 10:
                    stageCount = _a.sent();
                    if (!(stageCount === 0)) return [3 /*break*/, 15];
                    stages = [
                        { id: 'stage-1', title: 'Raciocínio Lógico', description: 'Testes de padrões, sequências e dedução lógica', order: 1, updatedAt: new Date() },
                        { id: 'stage-2', title: 'Matemática Básica e Resolução de Problemas', description: 'Cálculo mental, proporções e análise de dados', order: 2, updatedAt: new Date() },
                        { id: 'stage-3', title: 'Conhecimentos Gerais', description: 'Atualidades, cultura e conhecimentos interdisciplinares', order: 3, updatedAt: new Date() },
                        { id: 'stage-4', title: 'Comunicação Escrita', description: 'Redação, gramática e expressão textual', order: 4, updatedAt: new Date() },
                        { id: 'stage-5', title: 'Inglês', description: 'Compreensão de texto e vocabulário em inglês', order: 5, updatedAt: new Date() },
                        { id: 'stage-6', title: 'Perfil Comportamental', description: 'Análise de personalidade e comportamento profissional', order: 6, updatedAt: new Date() },
                    ];
                    _i = 0, stages_1 = stages;
                    _a.label = 11;
                case 11:
                    if (!(_i < stages_1.length)) return [3 /*break*/, 14];
                    stage = stages_1[_i];
                    return [4 /*yield*/, prisma.stage.create({
                            data: stage,
                        })];
                case 12:
                    _a.sent();
                    _a.label = 13;
                case 13:
                    _i++;
                    return [3 /*break*/, 11];
                case 14:
                    console.log('Etapas padrão criadas com sucesso!');
                    return [3 /*break*/, 16];
                case 15:
                    console.log('Etapas já existem, pulando criação.');
                    _a.label = 16;
                case 16: return [2 /*return*/];
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
