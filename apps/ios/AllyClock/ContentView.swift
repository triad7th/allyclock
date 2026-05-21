import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("AllyClock")
                .font(.largeTitle)
                .fontWeight(.semibold)

            Text("iOS scaffold ready")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
