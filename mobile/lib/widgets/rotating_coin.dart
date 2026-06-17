import 'dart:math' as math;
import 'package:flutter/material.dart';

class RotatingCoin extends StatefulWidget {
  final double? balance;

  const RotatingCoin({super.key, this.balance});

  @override
  State<RotatingCoin> createState() => _RotatingCoinState();
}

class _RotatingCoinState extends State<RotatingCoin>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  double _angle = 0;
  double _velocity = 0;
  bool _dragging = false;
  double _dragStartX = 0;
  double _dragStartAngle = 0;
  double _lastDragX = 0;
  DateTime _lastDragTime = DateTime.now();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(duration: const Duration(seconds: 6), vsync: this);
    _controller.addListener(_tick);
    _controller.repeat();
  }

  void _tick() {
    if (!_dragging && _velocity.abs() < 0.5) setState(() => _angle += 2.4);
    if (!_dragging && _velocity.abs() > 0.5) {
      setState(() { _angle += _velocity / 60; _velocity *= 0.95; });
    }
  }

  void _onPanStart(DragStartDetails d) {
    _dragging = true; _velocity = 0;
    _dragStartX = d.globalPosition.dx; _dragStartAngle = _angle;
    _lastDragX = _dragStartX; _lastDragTime = DateTime.now();
  }

  void _onPanUpdate(DragUpdateDetails d) {
    if (!_dragging) return;
    final dx = d.globalPosition.dx - _dragStartX;
    final dt = DateTime.now().difference(_lastDragTime).inMilliseconds / 1000.0;
    if (dt > 0.01) _velocity = -(d.globalPosition.dx - _lastDragX) / dt * 1.5;
    setState(() => _angle = _dragStartAngle - dx * 1.5);
    _lastDragX = d.globalPosition.dx; _lastDragTime = DateTime.now();
  }

  void _onPanEnd(DragEndDetails d) {
    _dragging = false;
    if (_velocity.abs() < 20) _velocity = 0;
  }

  @override
  void dispose() {
    _controller.removeListener(_tick); _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rad = _angle * (math.pi / 180);

    return GestureDetector(
      onHorizontalDragStart: _onPanStart,
      onHorizontalDragUpdate: _onPanUpdate,
      onHorizontalDragEnd: _onPanEnd,
      child: SizedBox(
        width: 260,
        height: 380,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Positioned(
              top: 0,
              child: Column(children: [
                const Text('BALANCE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 2.5, color: Color(0xFFA78BFA))),
                const SizedBox(height: 4),
                Text(widget.balance != null ? widget.balance!.toStringAsFixed(0) : '...',
                  style: const TextStyle(fontSize: 52, fontWeight: FontWeight.w900, color: Colors.white, height: 1)),
                const SizedBox(height: 2),
                const Text('BLUEBAY TOKEN', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFFA78BFA), letterSpacing: 1.5)),
              ]),
            ),
            Positioned(top: 145, child: _buildCoin(rad)),
            Positioned(
              bottom: 10,
              child: Container(width: 180, height: 20,
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(10),
                  gradient: RadialGradient(colors: [Colors.white.withValues(alpha: 0.12), Colors.transparent]))),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCoin(double angle) {
    return Transform(
      alignment: Alignment.center,
      transform: Matrix4.identity()
        ..setEntry(3, 2, 0.001)
        ..rotateY(angle),
      child: Container(
        width: 220, height: 220,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const RadialGradient(
            center: Alignment(-0.3, -0.3),
            colors: [Color(0xFFF5E6A0), Color(0xFFD4AF37), Color(0xFFB8860B), Color(0xFF8B6914)],
            stops: [0.0, 0.35, 0.7, 1.0],
          ),
          border: Border.all(color: const Color(0xFF73530C), width: 6),
          boxShadow: [
            BoxShadow(color: const Color(0xFFD4AF37).withValues(alpha: 0.5), blurRadius: 45, spreadRadius: 8),
            BoxShadow(color: Colors.black.withValues(alpha: 0.6), blurRadius: 25, offset: const Offset(0, 10)),
          ],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(width: 204, height: 204, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0xFFB8860B).withValues(alpha: 0.6), width: 2.5))),
            Container(width: 192, height: 192, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0xFFD4AF37).withValues(alpha: 0.35), width: 1.5))),
            ClipOval(child: Image.asset('assets/images/bluebay.jpg', width: 148, height: 148, fit: BoxFit.cover)),
            Container(width: 148, height: 148, decoration: BoxDecoration(shape: BoxShape.circle,
              gradient: RadialGradient(colors: [const Color(0xFFD4AF37).withValues(alpha: 0.12), const Color(0xFF8B6914).withValues(alpha: 0.25)]),
            )),
            Container(width: 220, height: 220, decoration: BoxDecoration(shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft, end: Alignment.bottomRight,
                colors: [Colors.white.withValues(alpha: 0.15), Colors.transparent, Colors.transparent, Colors.white.withValues(alpha: 0.08)],
              ),
            )),
          ],
        ),
      ),
    );
  }
}
