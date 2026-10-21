# Sa2web Plugin Editor

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Sa2web Plugin Editor là ứng dụng máy tính để chỉnh sửa đầy đủ plugin của trang sa2web. Bạn có thể chỉnh cấu hình và tập lệnh với gợi ý `api.` của Monaco, kiểm thử trên trang đã triển khai và xuất JSON plugin.

## Gỡ lỗi trực tuyến

1. Trong trang quản trị sa2web đã triển khai, mở mục **Plugins** của trang cần kiểm thử. Tạo plugin có cùng tên sẽ dùng trong trình chỉnh sửa và tạo **mã gỡ lỗi**. Giữ mã này bí mật.
2. Trong trình chỉnh sửa, nhập đúng **tên plugin**, **mã gỡ lỗi** và **URL thử nghiệm** HTTP(S) của trang. Chỉnh cấu hình và tập lệnh; bản nháp được lưu trên máy.
3. Nhấn **Launch**. Nếu cần, đăng nhập bằng tài khoản quản trị trong cửa sổ mới. Cookie đăng nhập được giữ lại cho các lần chạy sau.
4. Khi cửa sổ đến `/app/index`, bản nháp được đồng bộ với plugin có tên và mã khớp. Nếu không khớp sẽ báo lỗi; nếu thành công, thông báo hiện trong cửa sổ đó trong năm giây.
5. Kiểm thử trang trong cửa sổ đó. Chỉ phiên có mã mới tải cấu hình gỡ lỗi; khách truy cập khác không bị ảnh hưởng. Sau khi sửa, nhấn **Launch** lần nữa.

## Xuất plugin

Nhập **tên**, **phiên bản** (`ver`) và **mô tả** (`remark`), rồi nhấn **Export**. JSON bao gồm siêu dữ liệu, cấu hình và tập lệnh.

## Giấy phép

Phát hành theo [Apache License 2.0](LICENSE).
