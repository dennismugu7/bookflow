// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_proof_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PaymentProofInput extends PaymentProofInput {
  @override
  final String url;

  factory _$PaymentProofInput(
          [void Function(PaymentProofInputBuilder)? updates]) =>
      (PaymentProofInputBuilder()..update(updates))._build();

  _$PaymentProofInput._({required this.url}) : super._();
  @override
  PaymentProofInput rebuild(void Function(PaymentProofInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PaymentProofInputBuilder toBuilder() =>
      PaymentProofInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PaymentProofInput && url == other.url;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, url.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PaymentProofInput')..add('url', url))
        .toString();
  }
}

class PaymentProofInputBuilder
    implements Builder<PaymentProofInput, PaymentProofInputBuilder> {
  _$PaymentProofInput? _$v;

  String? _url;
  String? get url => _$this._url;
  set url(String? url) => _$this._url = url;

  PaymentProofInputBuilder() {
    PaymentProofInput._defaults(this);
  }

  PaymentProofInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _url = $v.url;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PaymentProofInput other) {
    _$v = other as _$PaymentProofInput;
  }

  @override
  void update(void Function(PaymentProofInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PaymentProofInput build() => _build();

  _$PaymentProofInput _build() {
    final _$result = _$v ??
        _$PaymentProofInput._(
          url: BuiltValueNullFieldError.checkNotNull(
              url, r'PaymentProofInput', 'url'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
