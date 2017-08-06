# Generated by the protocol buffer compiler.  DO NOT EDIT!
# source: table.proto

import sys
_b=sys.version_info[0]<3 and (lambda x:x) or (lambda x:x.encode('latin1'))
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from google.protobuf import reflection as _reflection
from google.protobuf import symbol_database as _symbol_database
from google.protobuf import descriptor_pb2
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor.FileDescriptor(
  name='table.proto',
  package='',
  syntax='proto3',
  serialized_pb=_b('\n\x0btable.proto\"l\n\x05Table\x12\x1d\n\x06schema\x18\x01 \x01(\x0b\x32\r.Table.Schema\x12\x18\n\x04\x63ols\x18\x02 \x03(\x0b\x32\n.Table.Col\x1a\x12\n\x03\x43ol\x12\x0b\n\x03val\x18\x01 \x03(\x05\x1a\x16\n\x06Schema\x12\x0c\n\x04name\x18\x01 \x03(\t\"\xbe\x01\n\x10ProgressiveTable\x12\'\n\x06\x62locks\x18\x01 \x03(\x0b\x32\x17.ProgressiveTable.Block\x1ai\n\x05\x42lock\x12(\n\x06schema\x18\x01 \x01(\x0b\x32\x18.ProgressiveTable.Schema\x12\r\n\x05lower\x18\x02 \x01(\x05\x12\x0e\n\x06higher\x18\x03 \x01(\x05\x12\n\n\x02id\x18\x04 \x01(\x05\x12\x0b\n\x03val\x18\x05 \x03(\x05\x1a\x16\n\x06Schema\x12\x0c\n\x04name\x18\x01 \x03(\t\"\x87\x01\n\x0eSimpleVizTable\x12&\n\x06schema\x18\x01 \x01(\x0b\x32\x16.SimpleVizTable.Schema\x12!\n\x04\x63ols\x18\x02 \x03(\x0b\x32\x13.SimpleVizTable.Col\x1a\x12\n\x03\x43ol\x12\x0b\n\x03val\x18\x01 \x03(\x02\x1a\x16\n\x06Schema\x12\x0c\n\x04name\x18\x01 \x03(\tb\x06proto3')
)




_TABLE_COL = _descriptor.Descriptor(
  name='Col',
  full_name='Table.Col',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='val', full_name='Table.Col.val', index=0,
      number=1, type=5, cpp_type=1, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=81,
  serialized_end=99,
)

_TABLE_SCHEMA = _descriptor.Descriptor(
  name='Schema',
  full_name='Table.Schema',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='name', full_name='Table.Schema.name', index=0,
      number=1, type=9, cpp_type=9, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=101,
  serialized_end=123,
)

_TABLE = _descriptor.Descriptor(
  name='Table',
  full_name='Table',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='schema', full_name='Table.schema', index=0,
      number=1, type=11, cpp_type=10, label=1,
      has_default_value=False, default_value=None,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='cols', full_name='Table.cols', index=1,
      number=2, type=11, cpp_type=10, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[_TABLE_COL, _TABLE_SCHEMA, ],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=15,
  serialized_end=123,
)


_PROGRESSIVETABLE_BLOCK = _descriptor.Descriptor(
  name='Block',
  full_name='ProgressiveTable.Block',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='schema', full_name='ProgressiveTable.Block.schema', index=0,
      number=1, type=11, cpp_type=10, label=1,
      has_default_value=False, default_value=None,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='lower', full_name='ProgressiveTable.Block.lower', index=1,
      number=2, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='higher', full_name='ProgressiveTable.Block.higher', index=2,
      number=3, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='id', full_name='ProgressiveTable.Block.id', index=3,
      number=4, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='val', full_name='ProgressiveTable.Block.val', index=4,
      number=5, type=5, cpp_type=1, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=187,
  serialized_end=292,
)

_PROGRESSIVETABLE_SCHEMA = _descriptor.Descriptor(
  name='Schema',
  full_name='ProgressiveTable.Schema',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='name', full_name='ProgressiveTable.Schema.name', index=0,
      number=1, type=9, cpp_type=9, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=101,
  serialized_end=123,
)

_PROGRESSIVETABLE = _descriptor.Descriptor(
  name='ProgressiveTable',
  full_name='ProgressiveTable',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='blocks', full_name='ProgressiveTable.blocks', index=0,
      number=1, type=11, cpp_type=10, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[_PROGRESSIVETABLE_BLOCK, _PROGRESSIVETABLE_SCHEMA, ],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=126,
  serialized_end=316,
)


_SIMPLEVIZTABLE_COL = _descriptor.Descriptor(
  name='Col',
  full_name='SimpleVizTable.Col',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='val', full_name='SimpleVizTable.Col.val', index=0,
      number=1, type=2, cpp_type=6, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=412,
  serialized_end=430,
)

_SIMPLEVIZTABLE_SCHEMA = _descriptor.Descriptor(
  name='Schema',
  full_name='SimpleVizTable.Schema',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='name', full_name='SimpleVizTable.Schema.name', index=0,
      number=1, type=9, cpp_type=9, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=101,
  serialized_end=123,
)

_SIMPLEVIZTABLE = _descriptor.Descriptor(
  name='SimpleVizTable',
  full_name='SimpleVizTable',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='schema', full_name='SimpleVizTable.schema', index=0,
      number=1, type=11, cpp_type=10, label=1,
      has_default_value=False, default_value=None,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='cols', full_name='SimpleVizTable.cols', index=1,
      number=2, type=11, cpp_type=10, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[_SIMPLEVIZTABLE_COL, _SIMPLEVIZTABLE_SCHEMA, ],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=319,
  serialized_end=454,
)

_TABLE_COL.containing_type = _TABLE
_TABLE_SCHEMA.containing_type = _TABLE
_TABLE.fields_by_name['schema'].message_type = _TABLE_SCHEMA
_TABLE.fields_by_name['cols'].message_type = _TABLE_COL
_PROGRESSIVETABLE_BLOCK.fields_by_name['schema'].message_type = _PROGRESSIVETABLE_SCHEMA
_PROGRESSIVETABLE_BLOCK.containing_type = _PROGRESSIVETABLE
_PROGRESSIVETABLE_SCHEMA.containing_type = _PROGRESSIVETABLE
_PROGRESSIVETABLE.fields_by_name['blocks'].message_type = _PROGRESSIVETABLE_BLOCK
_SIMPLEVIZTABLE_COL.containing_type = _SIMPLEVIZTABLE
_SIMPLEVIZTABLE_SCHEMA.containing_type = _SIMPLEVIZTABLE
_SIMPLEVIZTABLE.fields_by_name['schema'].message_type = _SIMPLEVIZTABLE_SCHEMA
_SIMPLEVIZTABLE.fields_by_name['cols'].message_type = _SIMPLEVIZTABLE_COL
DESCRIPTOR.message_types_by_name['Table'] = _TABLE
DESCRIPTOR.message_types_by_name['ProgressiveTable'] = _PROGRESSIVETABLE
DESCRIPTOR.message_types_by_name['SimpleVizTable'] = _SIMPLEVIZTABLE
_sym_db.RegisterFileDescriptor(DESCRIPTOR)

Table = _reflection.GeneratedProtocolMessageType('Table', (_message.Message,), dict(

  Col = _reflection.GeneratedProtocolMessageType('Col', (_message.Message,), dict(
    DESCRIPTOR = _TABLE_COL,
    __module__ = 'table_pb2'
    # @@protoc_insertion_point(class_scope:Table.Col)
    ))
  ,

  Schema = _reflection.GeneratedProtocolMessageType('Schema', (_message.Message,), dict(
    DESCRIPTOR = _TABLE_SCHEMA,
    __module__ = 'table_pb2'
    # @@protoc_insertion_point(class_scope:Table.Schema)
    ))
  ,
  DESCRIPTOR = _TABLE,
  __module__ = 'table_pb2'
  # @@protoc_insertion_point(class_scope:Table)
  ))
_sym_db.RegisterMessage(Table)
_sym_db.RegisterMessage(Table.Col)
_sym_db.RegisterMessage(Table.Schema)

ProgressiveTable = _reflection.GeneratedProtocolMessageType('ProgressiveTable', (_message.Message,), dict(

  Block = _reflection.GeneratedProtocolMessageType('Block', (_message.Message,), dict(
    DESCRIPTOR = _PROGRESSIVETABLE_BLOCK,
    __module__ = 'table_pb2'
    # @@protoc_insertion_point(class_scope:ProgressiveTable.Block)
    ))
  ,

  Schema = _reflection.GeneratedProtocolMessageType('Schema', (_message.Message,), dict(
    DESCRIPTOR = _PROGRESSIVETABLE_SCHEMA,
    __module__ = 'table_pb2'
    # @@protoc_insertion_point(class_scope:ProgressiveTable.Schema)
    ))
  ,
  DESCRIPTOR = _PROGRESSIVETABLE,
  __module__ = 'table_pb2'
  # @@protoc_insertion_point(class_scope:ProgressiveTable)
  ))
_sym_db.RegisterMessage(ProgressiveTable)
_sym_db.RegisterMessage(ProgressiveTable.Block)
_sym_db.RegisterMessage(ProgressiveTable.Schema)

SimpleVizTable = _reflection.GeneratedProtocolMessageType('SimpleVizTable', (_message.Message,), dict(

  Col = _reflection.GeneratedProtocolMessageType('Col', (_message.Message,), dict(
    DESCRIPTOR = _SIMPLEVIZTABLE_COL,
    __module__ = 'table_pb2'
    # @@protoc_insertion_point(class_scope:SimpleVizTable.Col)
    ))
  ,

  Schema = _reflection.GeneratedProtocolMessageType('Schema', (_message.Message,), dict(
    DESCRIPTOR = _SIMPLEVIZTABLE_SCHEMA,
    __module__ = 'table_pb2'
    # @@protoc_insertion_point(class_scope:SimpleVizTable.Schema)
    ))
  ,
  DESCRIPTOR = _SIMPLEVIZTABLE,
  __module__ = 'table_pb2'
  # @@protoc_insertion_point(class_scope:SimpleVizTable)
  ))
_sym_db.RegisterMessage(SimpleVizTable)
_sym_db.RegisterMessage(SimpleVizTable.Col)
_sym_db.RegisterMessage(SimpleVizTable.Schema)


# @@protoc_insertion_point(module_scope)
