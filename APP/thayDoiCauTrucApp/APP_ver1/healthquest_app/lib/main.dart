import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:pedometer/pedometer.dart';

void main() {
  runApp(MaterialApp(home: MyApp()));
}

class MyApp extends StatefulWidget {
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();

    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..enableZoom(false)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) {
            startListening();
          },
        ),
      )
      ..loadRequest(Uri.parse("http://10.0.2.2:3000/walk"));
  }

  void startListening() {
    Pedometer.stepCountStream.listen((event) {
      int steps = event.steps;

      // 👇 gửi sang HTML
      controller.runJavaScript("updateSteps($steps)");
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: WebViewWidget(controller: controller));
  }
}
