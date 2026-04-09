import 'package:flutter/material.dart';
import 'package:pedometer/pedometer.dart';
import 'package:http/http.dart' as http;

class StepScreen extends StatefulWidget {
  @override
  _StepScreenState createState() => _StepScreenState();
}

class _StepScreenState extends State<StepScreen> {
  String _steps = "0";

  @override
  void initState() {
    super.initState();
    startListening();
  }
  

  void startListening() {
    Pedometer.stepCountStream.listen((StepCount event) {
      setState(() {
        _steps = event.steps.toString();
      });
    });
  }
  Future<void> sendSteps(String steps) async {
  await http.post(
    Uri.parse("http://10.0.2.2:3000/api/steps"),
    body: {
      "steps": steps,
    },
  );
}

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Step Counter')),
      body: Center(
        child: Text(
          "Steps: $_steps",
          style: TextStyle(fontSize: 30),
        ),
      ),
    );
  }
  
}
