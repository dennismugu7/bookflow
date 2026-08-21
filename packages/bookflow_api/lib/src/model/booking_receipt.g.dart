// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'booking_receipt.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BookingReceipt extends BookingReceipt {
  @override
  final String id;
  @override
  final String serviceName;
  @override
  final int durationMinutes;
  @override
  final int priceKes;
  @override
  final String startsAt;
  @override
  final String status;

  factory _$BookingReceipt([void Function(BookingReceiptBuilder)? updates]) =>
      (BookingReceiptBuilder()..update(updates))._build();

  _$BookingReceipt._(
      {required this.id,
      required this.serviceName,
      required this.durationMinutes,
      required this.priceKes,
      required this.startsAt,
      required this.status})
      : super._();
  @override
  BookingReceipt rebuild(void Function(BookingReceiptBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BookingReceiptBuilder toBuilder() => BookingReceiptBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BookingReceipt &&
        id == other.id &&
        serviceName == other.serviceName &&
        durationMinutes == other.durationMinutes &&
        priceKes == other.priceKes &&
        startsAt == other.startsAt &&
        status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, serviceName.hashCode);
    _$hash = $jc(_$hash, durationMinutes.hashCode);
    _$hash = $jc(_$hash, priceKes.hashCode);
    _$hash = $jc(_$hash, startsAt.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'BookingReceipt')
          ..add('id', id)
          ..add('serviceName', serviceName)
          ..add('durationMinutes', durationMinutes)
          ..add('priceKes', priceKes)
          ..add('startsAt', startsAt)
          ..add('status', status))
        .toString();
  }
}

class BookingReceiptBuilder
    implements Builder<BookingReceipt, BookingReceiptBuilder> {
  _$BookingReceipt? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _serviceName;
  String? get serviceName => _$this._serviceName;
  set serviceName(String? serviceName) => _$this._serviceName = serviceName;

  int? _durationMinutes;
  int? get durationMinutes => _$this._durationMinutes;
  set durationMinutes(int? durationMinutes) =>
      _$this._durationMinutes = durationMinutes;

  int? _priceKes;
  int? get priceKes => _$this._priceKes;
  set priceKes(int? priceKes) => _$this._priceKes = priceKes;

  String? _startsAt;
  String? get startsAt => _$this._startsAt;
  set startsAt(String? startsAt) => _$this._startsAt = startsAt;

  String? _status;
  String? get status => _$this._status;
  set status(String? status) => _$this._status = status;

  BookingReceiptBuilder() {
    BookingReceipt._defaults(this);
  }

  BookingReceiptBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _serviceName = $v.serviceName;
      _durationMinutes = $v.durationMinutes;
      _priceKes = $v.priceKes;
      _startsAt = $v.startsAt;
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BookingReceipt other) {
    _$v = other as _$BookingReceipt;
  }

  @override
  void update(void Function(BookingReceiptBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BookingReceipt build() => _build();

  _$BookingReceipt _build() {
    final _$result = _$v ??
        _$BookingReceipt._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'BookingReceipt', 'id'),
          serviceName: BuiltValueNullFieldError.checkNotNull(
              serviceName, r'BookingReceipt', 'serviceName'),
          durationMinutes: BuiltValueNullFieldError.checkNotNull(
              durationMinutes, r'BookingReceipt', 'durationMinutes'),
          priceKes: BuiltValueNullFieldError.checkNotNull(
              priceKes, r'BookingReceipt', 'priceKes'),
          startsAt: BuiltValueNullFieldError.checkNotNull(
              startsAt, r'BookingReceipt', 'startsAt'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'BookingReceipt', 'status'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
