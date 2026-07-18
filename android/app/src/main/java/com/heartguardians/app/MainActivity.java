package com.heartguardians.app;

import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 인트로 오프닝 영상을 소리와 함께 자동재생 (제스처 없이).
        // WebView 기본은 미디어 재생에 사용자 제스처를 요구하므로 꺼준다.
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        enableImmersive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // 다른 화면(알림 등)에서 돌아오면 다시 몰입 모드로
        if (hasFocus) enableImmersive();
    }

    // Unity처럼 상단 상태바 + 하단 네비게이션바를 숨기는 몰입(immersive) 모드.
    // 가장자리에서 스와이프하면 바가 잠깐만 나타났다 다시 사라진다.
    private void enableImmersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
                new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
