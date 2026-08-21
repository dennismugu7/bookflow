// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'owner_booking_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const OwnerBookingInputStatusEnum _$ownerBookingInputStatusEnum_booked =
    const OwnerBookingInputStatusEnum._('booked');
const OwnerBookingInputStatusEnum _$ownerBookingInputStatusEnum_confirmed =
    const OwnerBookingInputStatusEnum._('confirmed');
const OwnerBookingInputStatusEnum _$ownerBookingInputStatusEnum_cancelled =
    const OwnerBookingInputStatusEnum._('cancelled');

OwnerBookingInputStatusEnum _$ownerBookingInputStatusEnumValueOf(String name) {
  switch (name) {
    case 'booked':
      return _$ownerBookingInputStatusEnum_booked;
    case 'confirmed':
      return _$ownerBookingInputStatusEnum_confirmed;
    case 'cancelled':
      return _$ownerBookingInputStatusEnum_cancelled;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<OwnerBookingInputStatusEnum>
    _$ownerBookingInputStatusEnumValues =
    BuiltSet<OwnerBookingInputStatusEnum>(const <OwnerBookingInputStatusEnum>[
  _$ownerBookingInputStatusEnum_booked,
  _$ownerBookingInputStatusEnum_confirmed,
  _$ownerBookingInputStatusEnum_cancelled,
]);

Serializer<OwnerBookingInputStatusEnum>
    _$ownerBookingInputStatusEnumSerializer =
    _$OwnerBookingInputStatusEnumSerializer();

class _$OwnerBookingInputStatusEnumSerializer
    implements PrimitiveSerializer<OwnerBookingInputStatusEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'booked': 'booked',
    'confirmed': 'confirmed',
    'cancelled': 'cancelled',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'booked': 'booked',
    'confirmed': 'confirmed',
    'cancelled': 'cancelled',
  };

  @override
  final Iterable<Type> types = const <Type>[OwnerBookingInputStatusEnum];
  @override
  final String wireName = 'OwnerBookingInputStatusEnum';

  @override
  Object serialize(Serializers serializers, OwnerBookingInputStatusEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  OwnerBookingInputStatusEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      OwnerBookingInputStatusEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$OwnerBookingInput extends OwnerBookingInput {
  @override
  final String id;
  @override
  final String serviceName;
  @override
  final int durationMinutes;
  @override
  final int priceKes;
  @override
  final String? serviceId;
  @override
  final String? teamMemberId;
  @override
  final String? teamMemberName;
  @override
  final String clientName;
  @override
  final String clientEmail;
  @override
  final String clientPhone;
  @override
  final String startsAt;
  @override
  final OwnerBookingInputStatusEnum status;
  @override
  final String? paymentProofUrl;

  factory _$OwnerBookingInput(
          [void Function(OwnerBookingInputBuilder)? updates]) =>
      (OwnerBookingInputBuilder()..update(updates))._build();

  _$OwnerBookingInput._(
      {required this.id,
      required this.serviceName,
      required this.durationMinutes,
      required this.priceKes,
      this.serviceId,
      this.teamMemberId,
      this.teamMemberName,
      required this.clientName,
      required this.clientEmail,
      required this.clientPhone,
      required this.startsAt,
      required this.status,
      this.paymentProofUrl})
      : super._();
  @override
  OwnerBookingInput rebuild(void Function(OwnerBookingInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  OwnerBookingInputBuilder toBuilder() =>
      OwnerBookingInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is OwnerBookingInput &&
        id == other.id &&
        serviceName == other.serviceName &&
        durationMinutes == other.durationMinutes &&
        priceKes == other.priceKes &&
        serviceId == other.serviceId &&
        teamMemberId == other.teamMemberId &&
        teamMemberName == other.teamMemberName &&
        clientName == other.clientName &&
        clientEmail == other.clientEmail &&
        clientPhone == other.clientPhone &&
        startsAt == other.startsAt &&
        status == other.status &&
        paymentProofUrl == other.paymentProofUrl;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, serviceName.hashCode);
    _$hash = $jc(_$hash, durationMinutes.hashCode);
    _$hash = $jc(_$hash, priceKes.hashCode);
    _$hash = $jc(_$hash, serviceId.hashCode);
    _$hash = $jc(_$hash, teamMemberId.hashCode);
    _$hash = $jc(_$hash, teamMemberName.hashCode);
    _$hash = $jc(_$hash, clientName.hashCode);
    _$hash = $jc(_$hash, clientEmail.hashCode);
    _$hash = $jc(_$hash, clientPhone.hashCode);
    _$hash = $jc(_$hash, startsAt.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, paymentProofUrl.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'OwnerBookingInput')
          ..add('id', id)
          ..add('serviceName', serviceName)
          ..add('durationMinutes', durationMinutes)
          ..add('priceKes', priceKes)
          ..add('serviceId', serviceId)
          ..add('teamMemberId', teamMemberId)
          ..add('teamMemberName', teamMemberName)
          ..add('clientName', clientName)
          ..add('clientEmail', clientEmail)
          ..add('clientPhone', clientPhone)
          ..add('startsAt', startsAt)
          ..add('status', status)
          ..add('paymentProofUrl', paymentProofUrl))
        .toString();
  }
}

class OwnerBookingInputBuilder
    implements Builder<OwnerBookingInput, OwnerBookingInputBuilder> {
  _$OwnerBookingInput? _$v;

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

  String? _serviceId;
  String? get serviceId => _$this._serviceId;
  set serviceId(String? serviceId) => _$this._serviceId = serviceId;

  String? _teamMemberId;
  String? get teamMemberId => _$this._teamMemberId;
  set teamMemberId(String? teamMemberId) => _$this._teamMemberId = teamMemberId;

  String? _teamMemberName;
  String? get teamMemberName => _$this._teamMemberName;
  set teamMemberName(String? teamMemberName) =>
      _$this._teamMemberName = teamMemberName;

  String? _clientName;
  String? get clientName => _$this._clientName;
  set clientName(String? clientName) => _$this._clientName = clientName;

  String? _clientEmail;
  String? get clientEmail => _$this._clientEmail;
  set clientEmail(String? clientEmail) => _$this._clientEmail = clientEmail;

  String? _clientPhone;
  String? get clientPhone => _$this._clientPhone;
  set clientPhone(String? clientPhone) => _$this._clientPhone = clientPhone;

  String? _startsAt;
  String? get startsAt => _$this._startsAt;
  set startsAt(String? startsAt) => _$this._startsAt = startsAt;

  OwnerBookingInputStatusEnum? _status;
  OwnerBookingInputStatusEnum? get status => _$this._status;
  set status(OwnerBookingInputStatusEnum? status) => _$this._status = status;

  String? _paymentProofUrl;
  String? get paymentProofUrl => _$this._paymentProofUrl;
  set paymentProofUrl(String? paymentProofUrl) =>
      _$this._paymentProofUrl = paymentProofUrl;

  OwnerBookingInputBuilder() {
    OwnerBookingInput._defaults(this);
  }

  OwnerBookingInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _serviceName = $v.serviceName;
      _durationMinutes = $v.durationMinutes;
      _priceKes = $v.priceKes;
      _serviceId = $v.serviceId;
      _teamMemberId = $v.teamMemberId;
      _teamMemberName = $v.teamMemberName;
      _clientName = $v.clientName;
      _clientEmail = $v.clientEmail;
      _clientPhone = $v.clientPhone;
      _startsAt = $v.startsAt;
      _status = $v.status;
      _paymentProofUrl = $v.paymentProofUrl;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(OwnerBookingInput other) {
    _$v = other as _$OwnerBookingInput;
  }

  @override
  void update(void Function(OwnerBookingInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  OwnerBookingInput build() => _build();

  _$OwnerBookingInput _build() {
    final _$result = _$v ??
        _$OwnerBookingInput._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'OwnerBookingInput', 'id'),
          serviceName: BuiltValueNullFieldError.checkNotNull(
              serviceName, r'OwnerBookingInput', 'serviceName'),
          durationMinutes: BuiltValueNullFieldError.checkNotNull(
              durationMinutes, r'OwnerBookingInput', 'durationMinutes'),
          priceKes: BuiltValueNullFieldError.checkNotNull(
              priceKes, r'OwnerBookingInput', 'priceKes'),
          serviceId: serviceId,
          teamMemberId: teamMemberId,
          teamMemberName: teamMemberName,
          clientName: BuiltValueNullFieldError.checkNotNull(
              clientName, r'OwnerBookingInput', 'clientName'),
          clientEmail: BuiltValueNullFieldError.checkNotNull(
              clientEmail, r'OwnerBookingInput', 'clientEmail'),
          clientPhone: BuiltValueNullFieldError.checkNotNull(
              clientPhone, r'OwnerBookingInput', 'clientPhone'),
          startsAt: BuiltValueNullFieldError.checkNotNull(
              startsAt, r'OwnerBookingInput', 'startsAt'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'OwnerBookingInput', 'status'),
          paymentProofUrl: paymentProofUrl,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
