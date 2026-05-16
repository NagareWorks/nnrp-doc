# NNRP/1-preview3 Common Header

preview3 keeps the preview2-frozen 40-byte common header and preserves the `meta_len + body_len` self-describing length model.

The common header fields are:

1. `magic`
2. `version_major`
3. `wire_format`
4. `msg_type`
5. `header_len`
6. `flags`
7. `meta_len`
8. `body_len`
9. `session_id`
10. `frame_id`
11. `view_id`
12. `route_id`
13. `trace_id`

<div class="bit-diagram">
  <div class="bit-row">
    <div class="bit-cell tone-a" style="flex: 1 1 0">magic</div>
    <div class="bit-cell tone-b" style="flex: 1 1 0">version_major</div>
    <div class="bit-cell tone-b" style="flex: 1 1 0">wire_format</div>
    <div class="bit-cell tone-c" style="flex: 1 1 0">msg_type</div>
    <div class="bit-cell tone-c" style="flex: 1 1 0">header_len</div>
    <div class="bit-cell tone-d" style="flex: 1 1 0">flags</div>
    <div class="bit-cell tone-e" style="flex: 2 1 0">meta_len</div>
    <div class="bit-cell tone-e" style="flex: 2 1 0">body_len</div>
  </div>
  <div class="bit-row">
    <div class="bit-cell tone-a" style="flex: 2 1 0">session_id</div>
    <div class="bit-cell tone-b" style="flex: 2 1 0">frame_id</div>
    <div class="bit-cell tone-c" style="flex: 2 1 0">view_id</div>
    <div class="bit-cell tone-d" style="flex: 2 1 0">route_id</div>
    <div class="bit-cell tone-e" style="flex: 4 1 0">trace_id</div>
  </div>
</div>

<p class="layout-note">This diagram shows the logical blocks in the header, not a bit-accurate scaled wireframe.</p>