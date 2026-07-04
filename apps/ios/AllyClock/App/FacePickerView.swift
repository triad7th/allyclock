import SwiftUI

/// Sheet listing the faces. Applies on selection and on dismissal (the AllyClock
/// sheet rule: no confirm/cancel).
struct FacePickerView: View {
    @Binding var selection: FaceKind
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(FaceKind.allCases) { face in
                Button {
                    selection = face
                    dismiss()
                } label: {
                    HStack {
                        Text(face.displayName)
                        Spacer()
                        if face == selection { SFIcon("checkmark").frame(width: 16, height: 16) }
                    }
                }
                .buttonStyle(.plain)
            }
            .navigationTitle("Faces")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { dismiss() } label: { SFIcon("xmark").frame(width: 16, height: 16) }
                }
            }
        }
    }
}
