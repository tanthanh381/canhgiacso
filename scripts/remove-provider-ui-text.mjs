import { readFile, writeFile } from 'node:fs/promises';

const path = 'app/page.tsx';
let source = await readFile(path, 'utf8');

const providerNote = '        <p className="auth-security-note"><b>Chế độ khách:</b> Không tạo tài khoản và không gửi kết quả lên máy chủ. Supabase chỉ được dùng khi bạn chủ động đăng ký hoặc đăng nhập.</p>\n';
if (!source.includes(providerNote)) throw new Error('Expected provider note not found');
source = source.replace(providerNote, '');

const registerError = `          setAuthError(error.message.toLowerCase().includes("database")\n            ? "Email hoặc tên đăng nhập đã được sử dụng. Vui lòng chọn thông tin khác."\n            : error.message);`;
const safeRegisterError = `          setAuthError(error.message.toLowerCase().includes("database")\n            ? "Email hoặc tên đăng nhập đã được sử dụng. Vui lòng chọn thông tin khác."\n            : "Không thể tạo tài khoản lúc này. Vui lòng kiểm tra thông tin và thử lại.");`;
if (!source.includes(registerError)) throw new Error('Expected registration error block not found');
source = source.replace(registerError, safeRegisterError);

const loginError = '          setAuthError(error?.message ?? "Email hoặc mật khẩu không đúng.");';
if (!source.includes(loginError)) throw new Error('Expected login error line not found');
source = source.replace(loginError, '          setAuthError("Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được xác nhận.");');

await writeFile(path, source);
