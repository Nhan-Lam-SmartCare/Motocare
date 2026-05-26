package com.smartcare.motocare

// =========================================================================================
// MÃ NGUỒN DƯỚI ĐÂY ĐÃ ĐƯỢC CHÚ THÍCH (COMMENT) ĐỂ TRÁNH LỖI BIÊN DỊCH (COMPILE ERROR)
// khi dự án chưa kích hoạt thư viện Firebase SDK.
//
// Khi bạn sẵn sàng cài đặt thông báo đẩy (FCM):
// Hãy làm theo "Bước 3" và "Bước 4" ở cuối tài liệu "walkthrough.md" để kích hoạt thư viện,
// sau đó xóa các ký hiệu comment (/* và */) ở dưới để mã nguồn hoạt động bình thường!
// =========================================================================================

/*
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyFirebaseMessagingService : FirebaseMessagingService() {

    // Hàm tự động gọi khi điện thoại nhận được thông báo đẩy từ Firebase
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Chỉ xử lý nếu thông báo có chứa tiêu đề và nội dung
        remoteMessage.notification?.let {
            sendNotification(it.title ?: "Thông báo MotoCare", it.body ?: "")
        }
    }

    // Hàm tự động gọi khi Firebase cấp một Token định danh mới cho thiết bị này
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Token này dùng để gửi thông báo riêng biệt cho từng điện thoại.
        // Bạn có thể gửi token này lên server Supabase của bạn thông qua API để lưu trữ.
    }

    // Khởi tạo và hiển thị thông báo native trên thanh trạng thái điện thoại
    private fun sendNotification(title: String, messageBody: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        
        // Tạo PendingIntent để khi bấm vào thông báo sẽ tự động mở ứng dụng MainActivity
        val pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = "motocare_default_channel"
        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        
        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.mipmap.ic_launcher) // Icon hiển thị của thông báo (sử dụng icon app)
            .setContentTitle(title)
            .setContentText(messageBody)
            .setAutoCancel(true) // Tự tắt thông báo sau khi bấm
            .setSound(defaultSoundUri) // Phát âm thanh mặc định
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Hỗ trợ tạo kênh thông báo (Notification Channel) bắt buộc từ Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Thông báo dịch vụ MotoCare",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Kênh nhận thông báo đẩy tiến độ và hóa đơn sửa chữa MotoCare"
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Kích hoạt hiển thị thông báo
        notificationManager.notify(System.currentTimeMillis().toInt(), notificationBuilder.build())
    }
}
*/
