package com.smartcare.motocare

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    // URL KHỞI CHẠY WEB APP
    // - Local dev: Sử dụng IP máy chạy Web App (Ví dụ: "http://192.168.1.209:5173" hoặc giả lập "http://10.0.2.2:5173")
    // - Production: Thay tên miền của bạn ở đây (Ví dụ: "https://motocare.vercel.app")
    private val webAppUrl = "https://nhanlam.shop/"

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout

    // Biến phục vụ tính năng chụp ảnh và chọn file tải lên
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoPath: String? = null

    // Đăng ký nhận kết quả từ trình chọn file/chụp ảnh của Android
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data: Intent? = result.data
            var results: Array<Uri>? = null

            // Nếu người dùng chọn chụp ảnh từ camera
            if (data == null || data.data == null) {
                cameraPhotoPath?.let {
                    results = arrayOf(Uri.fromFile(File(it)))
                }
            } else {
                val dataString = data.dataString
                if (dataString != null) {
                    results = arrayOf(Uri.parse(dataString))
                }
            }
            filePathCallback?.onReceiveValue(results)
        } else {
            // Huỷ chọn file
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Ánh xạ các view
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout)

        // Cấu hình Swipe to Refresh
        swipeRefreshLayout.setColorSchemeResources(R.color.primary_blue, R.color.gold)
        swipeRefreshLayout.setOnRefreshListener {
            webView.reload()
        }

        // Tối ưu hóa cài đặt WebView dành cho React/SPA
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // Cực kỳ quan trọng để lưu Session, LocalStorage của React
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
            javaScriptCanOpenWindowsAutomatically = true
            mediaPlaybackRequiresUserGesture = false
            
            // Tận dụng phần cứng đồ hoạ để cuộn mượt hơn
            setRenderPriority(WebSettings.RenderPriority.HIGH)
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        // Tự động kiểm tra và khóa tính năng SwipeToRefresh khi WebView không ở vị trí cuộn đầu trang (Tránh xung đột cuộn)
        webView.viewTreeObserver.addOnScrollChangedListener {
            swipeRefreshLayout.isEnabled = webView.scrollY == 0
        }

        // Cấu hình WebViewClient để kiểm soát điều hướng link
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                
                // Hỗ trợ gọi điện, email hoặc bản đồ trực tiếp từ Web App
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("geo:")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Không thể mở ứng dụng liên quan", Toast.LENGTH_SHORT).show()
                    }
                    return true
                }
                
                // Mở mọi trang liên quan trong nội bộ WebView để giữ chân người dùng trong ứng dụng
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefreshLayout.isRefreshing = false
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                swipeRefreshLayout.isRefreshing = false
                // Hiển thị thông báo nếu bị lỗi mất mạng
                if (request?.isForMainFrame == true) {
                    Toast.makeText(this@MainActivity, "Không kết nối được máy chủ. Vui lòng kiểm tra mạng!", Toast.LENGTH_LONG).show()
                }
            }
        }

        // Cấu hình WebChromeClient để quản lý thanh tiến trình và chọn file/camera
        webView.webChromeClient = object : WebChromeClient() {
            
            // Thanh Progress Bar chạy ngang mép trên theo phần trăm tải thực tế
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.visibility = View.VISIBLE
                progressBar.progress = newProgress
                if (newProgress == 100) {
                    progressBar.visibility = View.GONE
                }
            }

            // Xử lý nút tải ảnh/tập tin (Camera và Thư viện ảnh điện thoại)
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                // Huỷ callback cũ nếu có
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                // Kiểm tra và yêu cầu quyền Camera/Bộ nhớ trước khi mở
                if (!checkPermissions()) {
                    requestPermissions()
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    return false
                }

                // Intent mở Camera chụp ảnh trực tiếp
                var takePictureIntent: Intent? = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                if (takePictureIntent?.resolveActivity(packageManager) != null) {
                    var photoFile: File? = null
                    try {
                        photoFile = createImageFile()
                        takePictureIntent.putExtra("PhotoPath", cameraPhotoPath)
                    } catch (ex: IOException) {
                        Toast.makeText(this@MainActivity, "Không thể tạo tệp ảnh", Toast.LENGTH_SHORT).show()
                    }

                    if (photoFile != null) {
                        val photoURI: Uri = FileProvider.getUriForFile(
                            this@MainActivity,
                            "${applicationContext.packageName}.fileprovider",
                            photoFile
                        )
                        takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI)
                    } else {
                        takePictureIntent = null
                    }
                }

                // Intent mở trình chọn tệp trong bộ nhớ điện thoại (Tài liệu hoặc Thư viện ảnh)
                val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*" // Chỉ định tải tệp ảnh (phù hợp với chụp xe/phụ tùng)
                }

                val intentArray: Array<Intent?> = takePictureIntent?.let { arrayOf(it) } ?: emptyArray()

                // Tạo hộp thoại lựa chọn tổng hợp (Chụp ảnh mới hoặc Chọn ảnh có sẵn)
                val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
                    putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
                    putExtra(Intent.EXTRA_TITLE, "Chọn hành động")
                    putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray)
                }

                fileChooserLauncher.launch(chooserIntent)
                return true
            }
        }

        // Tải trang Web App khởi chạy
        webView.loadUrl(webAppUrl)
    }

    // Hàm tạo tệp tạm để lưu trữ ảnh chụp từ Camera điện thoại
    @Throws(IOException::class)
    private fun createImageFile(): File {
        val timeStamp: String = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val imageFileName = "JPEG_${timeStamp}_"
        val storageDir: File? = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile(
            imageFileName,
            ".jpg",
            storageDir
        ).apply {
            cameraPhotoPath = absolutePath
        }
    }

    // Hàm kiểm tra các quyền hệ thống đã được cấp chưa
    private fun checkPermissions(): Boolean {
        val cameraGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        return cameraGranted
    }

    // Hàm gửi yêu cầu cấp quyền Camera
    private fun requestPermissions() {
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.CAMERA),
            101
        )
    }

    // Xử lý nút quay lại (Back) vật lý trên Android
    override fun onBackPressed() {
        // Nếu WebView có lịch sử đi lùi trang web, hãy lùi lại thay vì thoát ứng dụng
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            // Xác nhận thoát ứng dụng nếu ở trang chủ
            super.onBackPressed()
        }
    }
}
