// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_service_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CreateServiceRequest extends CreateServiceRequest {
  @override
  final String name;
  @override
  final int durationMinutes;
  @override
  final int priceKes;
  @override
  final int? position;

  factory _$CreateServiceRequest(
          [void Function(CreateServiceRequestBuilder)? updates]) =>
      (CreateServiceRequestBuilder()..update(updates))._build();

  _$CreateServiceRequest._(
      {required this.name,
      required this.durationMinutes,
      required this.priceKes,
      this.position})
      : super._();
  @override
  CreateServiceRequest rebuild(
          void Function(CreateServiceRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreateServiceRequestBuilder toBuilder() =>
      CreateServiceRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreateServiceRequest &&
        name == other.name &&
        durationMinutes == other.durationMinutes &&
        priceKes == other.priceKes &&
        position == other.position;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, durationMinutes.hashCode);
    _$hash = $jc(_$hash, priceKes.hashCode);
    _$hash = $jc(_$hash, position.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CreateServiceRequest')
          ..add('name', name)
          ..add('durationMinutes', durationMinutes)
          ..add('priceKes', priceKes)
          ..add('position', position))
        .toString();
  }
}

class CreateServiceRequestBuilder
    implements Builder<CreateServiceRequest, CreateServiceRequestBuilder> {
  _$CreateServiceRequest? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  int? _durationMinutes;
  int? get durationMinutes => _$this._durationMinutes;
  set durationMinutes(int? durationMinutes) =>
      _$this._durationMinutes = durationMinutes;

  int? _priceKes;
  int? get priceKes => _$this._priceKes;
  set priceKes(int? priceKes) => _$this._priceKes = priceKes;

  int? _position;
  int? get position => _$this._position;
  set position(int? position) => _$this._position = position;

  CreateServiceRequestBuilder() {
    CreateServiceRequest._defaults(this);
  }

  CreateServiceRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _durationMinutes = $v.durationMinutes;
      _priceKes = $v.priceKes;
      _position = $v.position;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CreateServiceRequest other) {
    _$v = other as _$CreateServiceRequest;
  }

  @override
  void update(void Function(CreateServiceRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreateServiceRequest build() => _build();

  _$CreateServiceRequest _build() {
    final _$result = _$v ??
        _$CreateServiceRequest._(
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'CreateServiceRequest', 'name'),
          durationMinutes: BuiltValueNullFieldError.checkNotNull(
              durationMinutes, r'CreateServiceRequest', 'durationMinutes'),
          priceKes: BuiltValueNullFieldError.checkNotNull(
              priceKes, r'CreateServiceRequest', 'priceKes'),
          position: position,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
