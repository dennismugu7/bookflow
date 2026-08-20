// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'update_service_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$UpdateServiceRequestInput extends UpdateServiceRequestInput {
  @override
  final String? name;
  @override
  final int? durationMinutes;
  @override
  final int? priceKes;
  @override
  final int? position;

  factory _$UpdateServiceRequestInput(
          [void Function(UpdateServiceRequestInputBuilder)? updates]) =>
      (UpdateServiceRequestInputBuilder()..update(updates))._build();

  _$UpdateServiceRequestInput._(
      {this.name, this.durationMinutes, this.priceKes, this.position})
      : super._();
  @override
  UpdateServiceRequestInput rebuild(
          void Function(UpdateServiceRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  UpdateServiceRequestInputBuilder toBuilder() =>
      UpdateServiceRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is UpdateServiceRequestInput &&
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
    return (newBuiltValueToStringHelper(r'UpdateServiceRequestInput')
          ..add('name', name)
          ..add('durationMinutes', durationMinutes)
          ..add('priceKes', priceKes)
          ..add('position', position))
        .toString();
  }
}

class UpdateServiceRequestInputBuilder
    implements
        Builder<UpdateServiceRequestInput, UpdateServiceRequestInputBuilder> {
  _$UpdateServiceRequestInput? _$v;

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

  UpdateServiceRequestInputBuilder() {
    UpdateServiceRequestInput._defaults(this);
  }

  UpdateServiceRequestInputBuilder get _$this {
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
  void replace(UpdateServiceRequestInput other) {
    _$v = other as _$UpdateServiceRequestInput;
  }

  @override
  void update(void Function(UpdateServiceRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  UpdateServiceRequestInput build() => _build();

  _$UpdateServiceRequestInput _build() {
    final _$result = _$v ??
        _$UpdateServiceRequestInput._(
          name: name,
          durationMinutes: durationMinutes,
          priceKes: priceKes,
          position: position,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
