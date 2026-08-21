// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'delete_account_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DeleteAccountRequestInput extends DeleteAccountRequestInput {
  @override
  final String? reason;

  factory _$DeleteAccountRequestInput(
          [void Function(DeleteAccountRequestInputBuilder)? updates]) =>
      (DeleteAccountRequestInputBuilder()..update(updates))._build();

  _$DeleteAccountRequestInput._({this.reason}) : super._();
  @override
  DeleteAccountRequestInput rebuild(
          void Function(DeleteAccountRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DeleteAccountRequestInputBuilder toBuilder() =>
      DeleteAccountRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DeleteAccountRequestInput && reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DeleteAccountRequestInput')
          ..add('reason', reason))
        .toString();
  }
}

class DeleteAccountRequestInputBuilder
    implements
        Builder<DeleteAccountRequestInput, DeleteAccountRequestInputBuilder> {
  _$DeleteAccountRequestInput? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  DeleteAccountRequestInputBuilder() {
    DeleteAccountRequestInput._defaults(this);
  }

  DeleteAccountRequestInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DeleteAccountRequestInput other) {
    _$v = other as _$DeleteAccountRequestInput;
  }

  @override
  void update(void Function(DeleteAccountRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DeleteAccountRequestInput build() => _build();

  _$DeleteAccountRequestInput _build() {
    final _$result = _$v ??
        _$DeleteAccountRequestInput._(
          reason: reason,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
